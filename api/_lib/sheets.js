import { google } from "googleapis";

/**
 * Backend propio (Vercel Serverless Functions) que reemplaza la parte
 * PÚBLICA del Apps Script (validar token / guardar respuestas), hablando
 * directo con el mismo Google Sheet vía la API de Sheets con una cuenta
 * de servicio. Las herramientas del menú del Sheet (generar enlaces,
 * enviar correos) se quedan en Apps Script — no se tocan.
 *
 * Variables de entorno requeridas (configúralas en Vercel, nunca en el repo):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY_B64    (el valor de "private_key" del JSON, codificado en base64 —
 *                              así queda en una sola línea, inmune a que la UI de Vercel
 *                              o el portapapeles dañen los saltos de línea al pegar)
 *   GOOGLE_SHEET_ID           (el ID del Sheet, entre /d/ y /edit en la URL)
 */

let cachedSheets = null;

export function decodePrivateKey() {
  const b64 = (process.env.GOOGLE_PRIVATE_KEY_B64 || "").trim();
  return Buffer.from(b64, "base64").toString("utf8");
}

export function getSheetsClient() {
  if (cachedSheets) return cachedSheets;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = decodePrivateKey();
  // OJO: la clase JWT de google-auth-library v11+ recibe un solo objeto de opciones,
  // no argumentos posicionales — con posicionales construye un cliente sin credenciales
  // y falla siempre con "unregistered callers", sin importar qué tan válida sea la llave.
  const auth = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  cachedSheets = google.sheets({ version: "v4", auth });
  return cachedSheets;
}

export function sheetId() {
  return process.env.GOOGLE_SHEET_ID;
}

/* ---------- TOKENS (hoja "Tokens": Token,Tipo,Nombre,Email,Estado,Creado,Usado,Tiempo(seg),Cargo) ---------- */

export async function findToken(sheets, spreadsheetId, token, tipo) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "Tokens!A:I" });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[0] || "") === String(token)) {
      const rowTipo = String(row[1] || "").toLowerCase();
      const targetTipo = String(tipo || "").toLowerCase();
      const esPerfilOEstilo =
        (targetTipo === "perfil" || targetTipo === "estilo") &&
        (rowTipo === "perfil" || rowTipo === "estilo");
      const tipoValido = !tipo || rowTipo === targetTipo || rowTipo === "ambas" || esPerfilOEstilo;
      return {
        found: true,
        row: i + 1,
        estado: String(row[4] || "").toLowerCase(),
        nombre: row[2] || "",
        email: row[3] || "",
        tipoOk: tipoValido,
        cargo: String(row[8] || "veterinario").toLowerCase(),
      };
    }
  }
  return { found: false };
}

export async function markUsed(sheets, spreadsheetId, row, tiempoSeg) {
  const data = [
    { range: `Tokens!E${row}`, values: [["usada"]] },
    { range: `Tokens!G${row}`, values: [[new Date().toISOString()]] },
  ];
  if (tiempoSeg) data.push({ range: `Tokens!H${row}`, values: [[tiempoSeg]] });
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });
}

/* ---------- helpers de hojas ---------- */

function columnLetter(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

async function ensureSheet(sheets, spreadsheetId, sheetName, headers) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const exists = (meta.data.sheets || []).some((s) => s.properties.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    return;
  }

  // migración suave: si ya existía con menos columnas de encabezado, completa las que faltan
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!1:1` });
  const current = (headerRes.data.values && headerRes.data.values[0]) || [];
  if (current.length < headers.length) {
    const missing = headers.slice(current.length);
    const startCol = columnLetter(current.length + 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${startCol}1`,
      valueInputOption: "RAW",
      requestBody: { values: [missing] },
    });
  }
}

async function appendRow(sheets, spreadsheetId, sheetName, headers, values) {
  await ensureSheet(sheets, spreadsheetId, sheetName, headers);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

/* ---------- GUARDAR RESULTADOS (mismas hojas/columnas que el Apps Script) ---------- */

export async function guardarInicial(sheets, spreadsheetId, data) {
  if (data.cargo === "peluqueria") {
    const headers = [
      "Fecha", "Nombre", "Email", "Token",
      "Experiencia previa en grooming", "Años de experiencia", "Certificaciones/cursos",
      "Cómodo lunes a sábado (turnos)", "Ubicación", "Expectativa salarial", "Justificación",
      "Puede empezar", "Cómodo con", "Banderas",
    ];
    const flags = [];
    if (String(data.comodoLunesSabado) !== "Sí") flags.push("No cómodo con turnos de lunes a sábado");
    if (String(data.experienciaPrevia) !== "Sí") flags.push("Sin experiencia previa en grooming");
    const row = [
      data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
      data.experienciaPrevia || "", data.aniosExp || "", data.certificaciones || "",
      data.comodoLunesSabado || "", data.ubicacion || "", data.salario || "", data.sustentoSalario || "",
      data.inicio || "", (data.comodidad || []).join(", "), flags.length ? flags.join(" · ") : "OK",
    ];
    await appendRow(sheets, spreadsheetId, "Postulaciones - Peluqueria", headers, row);
    return;
  }

  const headers = [
    "Fecha", "Nombre", "Email", "Token",
    "Tarjeta vigente", "Tarjeta Profesional", "Años experiencia", "Disponible sáb/dom",
    "Ubicación", "Expectativa salarial", "Justificación", "Puede empezar", "Cómodo con", "Banderas",
  ];
  const flags = [];
  if (String(data.tarjeta) !== "Sí") flags.push("Sin tarjeta vigente");
  if (String(data.disponibleFinde) !== "Sí") flags.push("No disponible fin de semana");
  const row = [
    data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
    data.tarjeta || "", data.tarProf || "", data.aniosExp || "", data.disponibleFinde || "",
    data.ubicacion || "", data.salario || "", data.sustentoSalario || "", data.inicio || "",
    (data.comodidad || []).join(", "), flags.length ? flags.join(" · ") : "OK",
  ];
  await appendRow(sheets, spreadsheetId, "Postulaciones", headers, row);
}

export async function guardarPerfil(sheets, spreadsheetId, data) {
  const headers = [
    "Fecha", "Nombre", "Email", "Token", "Tiempo (seg)",
    "Cognitivo (media)", "Cognitivo (tendencia)",
    "Orden (media)", "Orden (tendencia)",
    "Personas (media)", "Personas (tendencia)",
    "Presión (media)", "Presión (tendencia)",
    "Iniciativa (media)", "Iniciativa (tendencia)",
    "Resumen", "Respuestas (JSON)", "Cargo",
  ];
  const d = data.dimensiones || {};
  const cell = (k) => (d[k] ? [d[k].media !== undefined ? d[k].media : "", d[k].tendencia || ""] : ["", ""]);
  const row = [
    data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "", data.tiempoSeg || "",
    ...cell("cognitivo"), ...cell("orden"), ...cell("personas"), ...cell("presion"), ...cell("iniciativa"),
    data.resumen || "", JSON.stringify(data.respuestas || {}), data.cargo || "veterinario",
  ];
  await appendRow(sheets, spreadsheetId, "Perfiles", headers, row);
}

export async function guardarTecnica(sheets, spreadsheetId, data) {
  if (data.cargo === "peluqueria") {
    const headers = [
      "Fecha", "Nombre", "Email", "Token", "Tiempo (seg)", "Auto-enviado",
      "Puntaje objetivo", "Total", "% Objetivo",
      "Detalle cálculo (JSON)", "Detalle higiene/equipo (JSON)", "Detalle comportamiento animal (JSON)",
      "Casos (JSON)", "Respuestas abiertas (JSON)",
    ];
    const pct = data.total ? Math.round((data.puntaje / data.total) * 100) : "";
    const row = [
      data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
      data.tiempoSeg || "", data.autoenviado ? "Sí" : "No",
      data.puntaje, data.total, pct,
      JSON.stringify(data.detalleCalc || {}),
      JSON.stringify(data.detalleHigiene || {}),
      JSON.stringify(data.detalleComportamiento || {}),
      JSON.stringify(data.casos || {}),
      JSON.stringify(data.abiertas || {}),
    ];
    await appendRow(sheets, spreadsheetId, "Pruebas - Peluqueria", headers, row);
    return;
  }

  const headers = [
    "Fecha", "Nombre", "Email", "Token", "Tiempo (seg)", "Auto-enviado",
    "Puntaje objetivo", "Total", "% Objetivo",
    "Detalle cálculo (JSON)", "Detalle opción múltiple (JSON)", "Detalle gestión (JSON)",
    "Casos clínicos (JSON)", "Respuestas abiertas (JSON)",
  ];
  const pct = data.total ? Math.round((data.puntaje / data.total) * 100) : "";
  const row = [
    data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
    data.tiempoSeg || "", data.autoenviado ? "Sí" : "No",
    data.puntaje, data.total, pct,
    JSON.stringify(data.detalleCalc || {}),
    JSON.stringify(data.detalleMCQ || {}),
    JSON.stringify(data.detalleGestion || {}),
    JSON.stringify(data.casosClinicos || {}),
    JSON.stringify(data.abiertas || {}),
  ];
  await appendRow(sheets, spreadsheetId, "Pruebas", headers, row);
}
