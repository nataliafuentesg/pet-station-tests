// Endpoint temporal de diagnóstico — no expone ningún valor secreto,
// solo confirma si las variables de entorno están llegando al runtime
// y si la llave en base64 decodifica a un PEM bien formado.
// Bórralo cuando terminemos de diagnosticar.
import { decodePrivateKey } from "./_lib/sheets.js";

export default function handler(req, res) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const b64 = process.env.GOOGLE_PRIVATE_KEY_B64 || "";
  const sheetId = process.env.GOOGLE_SHEET_ID || "";
  let key = "";
  let decodeError = null;
  try { key = decodePrivateKey(); } catch (e) { decodeError = String(e); }

  res.status(200).json({
    hasEmail: !!email,
    emailLooksRight: email.includes("@") && email.includes(".iam.gserviceaccount.com"),
    hasB64: !!b64,
    b64Length: b64.length,
    decodeError,
    keyLength: key.length,
    keyStartsRight: key.startsWith("-----BEGIN PRIVATE KEY-----"),
    keyEndsRight: key.trim().endsWith("-----END PRIVATE KEY-----"),
    keyLineCount: key.split("\n").length,
    hasSheetId: !!sheetId,
    sheetIdLength: sheetId.length,
  });
}
