// Endpoint temporal de diagnóstico — no expone ningún valor secreto,
// solo confirma si las variables de entorno están llegando al runtime.
// Bórralo cuando terminemos de diagnosticar.
export default function handler(req, res) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const key = process.env.GOOGLE_PRIVATE_KEY || "";
  const sheetId = process.env.GOOGLE_SHEET_ID || "";
  res.status(200).json({
    hasEmail: !!email,
    emailLooksRight: email.includes("@") && email.includes(".iam.gserviceaccount.com"),
    hasKey: !!key,
    keyLength: key.length,
    keyStartsRight: key.startsWith("-----BEGIN PRIVATE KEY-----"),
    keyHasEscapedNewlines: key.includes("\\n"),
    keyHasRealNewlines: key.includes("\n"),
    hasSheetId: !!sheetId,
    sheetIdLength: sheetId.length,
  });
}
