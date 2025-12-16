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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch { body = {}; }
  }

  const requestNumber = String(body.requestNumber || "").trim();
  const idTransaction = body.idTransaction || null;

  if (!requestNumber) {
    // aceita mesmo assim, mas devolve ok pra Versell não reenviar infinitamente
    return json(res, 200, { ok: true, note: "no requestNumber" });
  }

  const record = {
    requestNumber,
    idTransaction: idTransaction,
    statusTransaction: body.statusTransaction || body.status || "WAITING_FOR_APPROVAL",
    typeTransaction: body.typeTransaction || "PIX",
    value: body.value ?? null,
    debtorName: body.debtorName ?? null,
    debtorDocument: body.debtorDocument ?? null,
    date: body.date ?? null,
    endToEnd: body.endToEnd ?? null,
    updatedAt: new Date().toISOString()
  };

  const store = await getKV();
  if (store) {
    await store.set(`versell:status:${requestNumber}`, record, { ex: 60 * 60 * 6 });
    if (idTransaction) await store.set(`versell:map:${idTransaction}`, requestNumber, { ex: 60 * 60 * 6 });
  } else {
    mem.set(`versell:status:${requestNumber}`, record);
    if (idTransaction) mem.set(`versell:map:${idTransaction}`, requestNumber);
  }

  return json(res, 200, { ok: true });
}
