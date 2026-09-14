import { getSheetsClient, sheetId, findToken, markUsed, guardarInicial, guardarPerfil, guardarTecnica } from "./_lib/sheets.js";

const REQUIRE_TOKEN = true;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (data.tipo === "estilo") data.tipo = "perfil";

    const sheets = getSheetsClient();
    const spreadsheetId = sheetId();

    let cargo = "veterinario";
    if (REQUIRE_TOKEN) {
      const tok = data.token;
      if (!tok) return res.status(200).json({ ok: false, reason: "sin_token" });
      const chk = await findToken(sheets, spreadsheetId, tok, data.tipo);
      if (!chk.found) return res.status(200).json({ ok: false, reason: "no_existe" });
      if (chk.estado === "usada") return res.status(200).json({ ok: false, reason: "usada" });
      if (!chk.tipoOk) return res.status(200).json({ ok: false, reason: "tipo_incorrecto" });
      await markUsed(sheets, spreadsheetId, chk.row, data.tiempoSeg);
      cargo = chk.cargo || cargo;
    }
    data.cargo = cargo; // el cargo siempre sale del token, nunca de lo que mande el front

    if (data.tipo === "tecnica") await guardarTecnica(sheets, spreadsheetId, data);
    else if (data.tipo === "inicial") await guardarInicial(sheets, spreadsheetId, data);
    else if (data.tipo === "perfil") await guardarPerfil(sheets, spreadsheetId, data);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err) });
  }
}
