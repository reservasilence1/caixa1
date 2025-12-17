// api/versell-webhook.js
let kv = null;
async function getKV() {
  if (kv) return kv;
  try {
    const mod = await import("@vercel/kv");
    kv = mod.kv;
    return kv;
  } catch {
    return null;
  }
}
const mem = globalThis.__VERSELL_MEM__ || (globalThis.__VERSELL_MEM__ = new Map());

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  // Vercel já faz parse do body se Content-Type for application/json
  if (req.body && typeof req.body === "object") return req.body;
  if (req.body && typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  // Fallback: ler body raw se necessário
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

export default async function handler(req, res) {
  // Webhooks devem aceitar apenas POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    // Se não conseguir ler o body, retorna 200 para evitar reenvios infinitos
    console.error("Webhook: erro ao ler body", e);
    return json(res, 200, { ok: true, note: "body parse error" });
  }

  const requestNumber = String(body.requestNumber || "").trim();
  const idTransaction = body.idTransaction || null;

  // Se não tiver requestNumber, retorna 200 para evitar reenvios infinitos do VersellPay
  if (!requestNumber) {
    console.warn("Webhook: recebido sem requestNumber", body);
    return json(res, 200, { ok: true, note: "no requestNumber" });
  }

  // Monta o record com todos os campos possíveis do webhook
  const record = {
    requestNumber,
    idTransaction: idTransaction || null,
    statusTransaction: body.statusTransaction || body.status || body.processingStatus || "WAITING_FOR_APPROVAL",
    typeTransaction: body.typeTransaction || "PIX",
    value: body.value ?? null,
    debtorName: body.debtorName ?? null,
    debtorDocument: body.debtorDocument ?? null,
    date: body.date ?? null,
    endToEnd: body.endToEnd ?? null,
    updatedAt: new Date().toISOString()
  };

  // Tenta salvar no KV (Vercel KV) ou fallback para memória
  try {
    const store = await getKV();
    if (store) {
      // Salva com TTL de 6 horas
      await store.set(`versell:status:${requestNumber}`, record, { ex: 60 * 60 * 6 });
      if (idTransaction) {
        await store.set(`versell:map:${idTransaction}`, requestNumber, { ex: 60 * 60 * 6 });
      }
    } else {
      // Fallback para memória (útil em desenvolvimento)
      mem.set(`versell:status:${requestNumber}`, record);
      if (idTransaction) {
        mem.set(`versell:map:${idTransaction}`, requestNumber);
      }
    }
  } catch (e) {
    // Loga o erro mas ainda retorna 200 para evitar reenvios
    console.error("Webhook: erro ao salvar no storage", e);
    // Tenta salvar na memória como fallback
    try {
      mem.set(`versell:status:${requestNumber}`, record);
      if (idTransaction) {
        mem.set(`versell:map:${idTransaction}`, requestNumber);
      }
    } catch (e2) {
      console.error("Webhook: erro ao salvar na memória", e2);
    }
  }

  // Sempre retorna 200 com ok: true para o VersellPay não reenviar
  return json(res, 200, { ok: true });
}
