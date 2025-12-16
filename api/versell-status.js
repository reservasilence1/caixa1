// api/versell-status.js

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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestNumber = (url.searchParams.get("requestNumber") || "").trim();

  if (!requestNumber) return json(res, 400, { error: "requestNumber is required" });

  const store = await getKV();

  let record = null;
  if (store) {
    record = await store.get(`versell:status:${requestNumber}`);
  } else {
    record = mem.get(`versell:status:${requestNumber}`) || null;
  }

  if (!record) {
    return json(res, 200, {
      requestNumber,
      statusTransaction: "WAITING_FOR_APPROVAL",
      note: "no webhook yet"
    });
  }

  return json(res, 200, record);
}
