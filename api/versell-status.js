// api/versell-status.js
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
  const id = String(req.query?.id || "").trim();           // idTransaction (preferido)
  const requestNumber = String(req.query?.r || "").trim(); // fallback por requestNumber

  if (!id && !requestNumber) {
    return json(res, 400, { error: "Missing id (idTransaction) or r (requestNumber)" });
  }

  const store = await getKV();

  // 1) se vier idTransaction, mapeia -> requestNumber
  let rn = requestNumber;
  if (!rn && id) {
    const keyMap = `versell:map:${id}`;
    rn = store ? await store.get(keyMap) : mem.get(keyMap);
  }

  if (!rn) return json(res, 404, { error: "Not found" });

  // 2) pega status pelo requestNumber
  const keyStatus = `versell:status:${rn}`;
  const record = store ? await store.get(keyStatus) : mem.get(keyStatus);

  if (!record) return json(res, 404, { error: "Not found" });

  return json(res, 200, record);
}
