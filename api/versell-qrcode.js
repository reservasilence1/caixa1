export default async function handler(req, res) {
  // CORS básico (se você chamar do mesmo domínio, ok; isso ajuda em preview/domínios diferentes)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!data) return res.status(400).json({ error: "JSON inválido" });

    // validações mínimas
    const amount = Number(data.amount || 0);
    const cpf = String(data?.customer?.document || "").replace(/\D/g, "");

    if (amount < 100) return res.status(400).json({ error: "Valor mínimo de R$ 1,00" });
    if (cpf.length !== 11) return res.status(400).json({ error: "CPF inválido" });

    // SUA URL de criação (POST)
    const DUTTYFY_CREATE_URL =
      "https://app.duttyfy.com.br/api-pix/vkf5TMM12Qn32cTNDGV-yhIaKC6tEYDIPu2SFKHNKNYgl_s7JZg4sArNGdWpnF4PtBeiz5FV2-kWigfJsU3vNA";

    const r = await fetch(DUTTYFY_CREATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const text = await r.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Resposta inválida da API", raw: text });
    }

    // se a API voltar erro no payload
    if (json?.error) return res.status(r.status >= 400 ? r.status : 400).json(json);

    return res.status(r.status || 200).json(json);
  } catch (e) {
    return res.status(500).json({ error: "Erro ao gerar pagamento" });
  }
}
