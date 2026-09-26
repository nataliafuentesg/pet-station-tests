import { getSheetsClient, sheetId, guardarNotaTecnica } from "./_lib/sheets.js";

// Misma clave que el resto de endpoints internos de peluquería.
const ADMIN_KEY = "PetStationPeluqueria2026";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  if (req.query.key !== ADMIN_KEY) return res.status(401).json({ ok: false, error: "no_autorizado" });

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { nombre, nota } = data;
    if (!nombre || !nota) return res.status(400).json({ ok: false, error: "faltan_campos" });

    const sheets = getSheetsClient();
    await guardarNotaTecnica(sheets, sheetId(), nombre, nota);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err) });
  }
}
