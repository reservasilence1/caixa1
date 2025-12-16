// api/versell-status.js

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (req.body && typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const VSPI = process.env.VSPI;
  const VSPS = process.env.VSPS;
  if (!VSPI || !VSPS) return json(res, 500, { error: "Missing env vars VSPI/VSPS" });

  const body = await readBody(req);

  // precisa pelo menos 1 desses
  const requestNumber = String(body.requestNumber || "").trim();
  const idTransaction = String(body.idTransaction || "").trim();
  const endToEnd = String(body.endToEnd || "").trim();

  if (!requestNumber && !idTransaction && !endToEnd) {
    return json(res, 400, { error: "Provide requestNumber OR idTransaction OR endToEnd" });
  }

  try {
    const r = await fetch("https://api.versellpay.com/api/v1/gateway/walletTransaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        vspi: VSPI,
        vsps: VSPS,
      },
      body: JSON.stringify({
        ...(requestNumber ? { requestNumber } : {}),
        ...(idTransaction ? { idTransaction } : {}),
        ...(endToEnd ? { endToEnd } : {}),
      }),
    });

    const data = await r.json().catch(() => null);

    if (!r.ok) {
      return json(res, r.status, { error: "Versell walletTransaction failed", details: data || null });
    }

    const tx = data?.transaction || null;

    // Normaliza: Versell retorna "processingStatus" no exemplo
    const status =
      String(tx?.processingStatus || tx?.statusTransaction || "").toUpperCase() || "UNKNOWN";

    // Devolve o essencial pro front
    return json(res, 200, {
      ok: true,
      status, // WAITING_FOR_APPROVAL | PAID_OUT | ...
      idTransaction: tx?.idTransaction || idTransaction || null,
      requestNumber: tx?.requestNumber || requestNumber || null,
      endToEnd: tx?.endToEnd || null,
      raw: tx, // opcional, pode remover se quiser
    });
  } catch (e) {
    return json(res, 500, { error: "Internal error", message: String(e?.message || e) });
  }
}
