// api/versell-qrcode.js
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

function getBaseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}`;
}

function normalizeAmount(v) {
  // aceita centavos (3280) ou reais (32.80)
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;

  // se veio como inteiro "grande", assume centavos
  // ex.: 3280 => 32.80
  if (Number.isInteger(n) && n >= 1000) {
    return Number((n / 100).toFixed(2));
  }
  return Number(n.toFixed(2));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const VSPI = process.env.VSPI;
  const VSPS = process.env.VSPS;
  if (!VSPI || !VSPS) {
    return json(res, 500, { error: "Missing env vars VSPI/VSPS" });
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try { body = JSON.parse(body || "{}"); } catch { body = {}; }
  }

  const requestNumber = String(body.requestNumber || "").trim();
  const amountNorm = normalizeAmount(body.amount);
  const client = body.client || {};
  const products = Array.isArray(body.products) ? body.products : [];

  if (!requestNumber) return json(res, 400, { error: "requestNumber is required" });
  if (!amountNorm) return json(res, 400, { error: "amount must be > 0" });

  const payload = {
    requestNumber,
    amount: amountNorm, // ✅ agora em REAIS (32.80)
    // Removido callbackUrl - usando polling ao invés de webhook
    client: {
      name: String(client.name || "").trim() || "Cliente",
      document: String(client.document || "").trim(),
      phoneNumber: String(client.phoneNumber || "").trim(),
      email: String(client.email || "").trim(),
      address: client.address || {
        codIbge: "",
        street: "",
        number: "",
        complement: "",
        zipCode: "",
        neighborhood: "",
        city: "",
        state: ""
      }
    },
    products: products.length
      ? products.map(p => ({
          description: String(p.description || "Pagamento"),
          quantity: Number(p.quantity || 1),
          value: normalizeAmount(p.value) ?? amountNorm // ✅ value em REAIS também
        }))
      : [{ description: "Pagamento", quantity: 1, value: amountNorm }]
  };

  try {
    const r = await fetch("https://api.versellpay.com/api/v1/gateway/request-qrcode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        vspi: VSPI,
        vsps: VSPS
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(() => null);

    if (!r.ok) {
      return json(res, r.status, { error: "Versell request failed", details: data || null, sent: payload });
    }

    const record = {
      requestNumber,
      idTransaction: data?.idTransaction || null,
      statusTransaction: "WAITING_FOR_APPROVAL",
      typeTransaction: "PIX",
      value: amountNorm,
      updatedAt: new Date().toISOString()
    };

    const store = await getKV();
    if (store) {
      await store.set(`versell:status:${requestNumber}`, record, { ex: 60 * 60 * 6 });
      if (record.idTransaction) await store.set(`versell:map:${record.idTransaction}`, requestNumber, { ex: 60 * 60 * 6 });
    } else {
      mem.set(`versell:status:${requestNumber}`, record);
      if (record.idTransaction) mem.set(`versell:map:${record.idTransaction}`, requestNumber);
    }

    return json(res, 200, {
      idTransaction: data?.idTransaction || null,
      paymentCode: data?.paymentCode || "",
      paymentCodeBase64: data?.paymentCodeBase64 || "",
      response: data?.response || "OK",
      requestNumber
    });
  } catch (e) {
    return json(res, 500, { error: "Internal error", message: String(e?.message || e) });
  }
}
