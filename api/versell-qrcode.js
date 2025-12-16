// api/versell-qrcode.js

let kv = null;
async function getKV() {
  if (kv) return kv;
  try {
    // Só funciona se você tiver Vercel KV configurado no projeto
    const mod = await import("@vercel/kv");
    kv = mod.kv;
    return kv;
  } catch (e) {
    return null;
  }
}

const mem = globalThis.__VERSELL_MEM__ || (globalThis.__VERSELL_MEM__ = new Map());

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function getBaseUrl(req) {
  // Vercel set headers
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}`;
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
  const amount = Number(body.amount);
  const client = body.client || {};
  const products = Array.isArray(body.products) ? body.products : [];

  if (!requestNumber) return json(res, 400, { error: "requestNumber is required" });
  if (!Number.isFinite(amount) || amount <= 0) return json(res, 400, { error: "amount must be > 0" });

  const baseUrl = getBaseUrl(req);
  const callbackUrl = `${baseUrl}/api/versell-webhook`;

  // Monta payload conforme doc Versell
  const payload = {
    requestNumber,
    amount,
    callbackUrl,
    client: {
      name: String(client.name || "").trim() || "Cliente",
      document: client.document ? String(client.document) : "",
      phoneNumber: client.phoneNumber ? String(client.phoneNumber) : "",
      email: client.email ? String(client.email) : "",
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
    products: products.length ? products : [{ description: "Pagamento", quantity: 1, value: amount }]
  };

  // Se document vier com pontuação, tudo bem (Versell aceita no exemplo),
  // mas vamos também mandar sem pontuação se você preferir:
  if (payload.client.document) payload.client.document = payload.client.document.trim();

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
      return json(res, r.status, {
        error: "Versell request failed",
        details: data || null
      });
    }

    // Guarda status inicial pra polling
    const record = {
      requestNumber,
      idTransaction: data?.idTransaction || null,
      statusTransaction: "WAITING_FOR_APPROVAL",
      typeTransaction: "PIX",
      value: amount,
      updatedAt: new Date().toISOString()
    };

    const store = await getKV();
    if (store) {
      await store.set(`versell:status:${requestNumber}`, record, { ex: 60 * 60 * 6 }); // 6h
      if (record.idTransaction) {
        await store.set(`versell:map:${record.idTransaction}`, requestNumber, { ex: 60 * 60 * 6 });
      }
    } else {
      mem.set(`versell:status:${requestNumber}`, record);
      if (record.idTransaction) mem.set(`versell:map:${record.idTransaction}`, requestNumber);
    }

    // Retorna pro front exatamente o que ele precisa
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
