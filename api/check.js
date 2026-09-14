import { getSheetsClient, sheetId, findToken } from "./_lib/sheets.js";

export default async function handler(req, res) {
  try {
    const { token, tipo } = req.query;

    if (!token) return res.status(200).json({ ok: true, valid: false, reason: "sin_token" });

    const sheets = getSheetsClient();
    const t = await findToken(sheets, sheetId(), token, tipo);

    if (!t.found) return res.status(200).json({ ok: true, valid: false, reason: "no_existe" });
    if (t.estado === "usada") return res.status(200).json({ ok: true, valid: false, reason: "usada", nombre: t.nombre, email: t.email });
    if (!t.tipoOk) return res.status(200).json({ ok: true, valid: false, reason: "tipo_incorrecto" });

    return res.status(200).json({ ok: true, valid: true, nombre: t.nombre, email: t.email, cargo: t.cargo });
  } catch (err) {
    return res.status(200).json({ ok: false, valid: false, reason: "error", error: String(err) });
  }
}
