// api/versell-webhook.js

let kv = null;
async function getKV() {
  if (kv) return kv;
  try {
    const mod = await import("@vercel/kv");
    kv = mod.kv;
    return kv;
  } catch (e) {
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

  // Versell pode mandar:
  // Cash-in: requestNumber, statusTransaction, idTransaction, typeTransaction, value, debtorName, debtorDocument, date, endToEnd
  // Cash-out: idTransaction, statusTransaction, date, message, value, endToEnd
  // MED: requestNumber, statusTransaction, idTransaction, typeTransaction=PIX_REFUND...

  const requestNumber = body.requestNumber ? String(body.requestNumber).trim() : null;
  const idTransaction = body.idTransaction ? String(body.idTransaction).trim() : null;

  // Se não vier requestNumber (ex cash-out), tentamos mapear via idTransaction
  const store = await getKV();

  let rn = requestNumber;
  if (!rn && idTransaction) {
    if (store) {
      rn = await store.get(`versell:map:${idTransaction}`);
    } else {
      rn = mem.get(`versell:map:${idTransaction}`) || null;
    }
  }

  // Se ainda não achou, devolve OK mesmo assim (não quebrar webhook)
  if (!rn) {
    return json(res, 200, { ok: true, note: "No requestNumber mapping found" });
  }

  const record = {
    requestNumber: rn,
    idTransaction: idTransaction || null,
    statusTransaction: body.statusTransaction || body.status || "UNKNOWN",
    typeTransaction: body.typeTransaction || null,
    value: body.value ?? null,
    endToEnd: body.endToEnd || null,
    message: body.message || null,
    updatedAt: new Date().toISOString(),
    raw: body
  };

  try {
    if (store) {
      await store.set(`versell:status:${rn}`, record, { ex: 60 * 60 * 6 });
    } else {
      mem.set(`versell:status:${rn}`, record);
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 200, { ok: true, note: "store failed", err: String(e?.message || e) });
  }
}
