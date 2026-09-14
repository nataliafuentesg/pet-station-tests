/**
 * Apps Script — pruebas de selección con control de tokens (un solo intento).
 * Soporta múltiples cargos (veterinario / peluqueria) en el mismo Sheet.
 *
 * Hojas que usa/crea solas:
 *   "Tokens"                       (compartida, con columna Cargo)
 *   "Perfiles"                     (compartida — estilo de trabajo, con columna Cargo)
 *   "Postulaciones"                (cuestionario inicial — veterinario)
 *   "Postulaciones - Peluqueria"   (cuestionario inicial — peluquero/a)
 *   "Pruebas"                      (prueba técnica — veterinario)
 *   "Pruebas - Peluqueria"         (prueba técnica — peluquero/a)
 *   "Candidatos"                   (seguimiento manual — veterinario, ya existente)
 *   "Candidatos - Peluqueria"      (seguimiento manual — peluquero/a, se crea sola)
 *
 * DESPLIEGUE:
 * 1. Google Sheet -> Extensiones -> Apps Script -> pega este código completo (reemplaza todo).
 * 2. Cambia FRONT_URL por la URL donde publiques el front (Vercel).
 * 3. Implementar -> Gestionar implementaciones -> Editar (lápiz) -> Nueva versión -> Implementar
 *      (si es la primera vez: Implementar -> Nueva implementación -> Aplicación web
 *       Ejecutar como: Yo | Acceso: Cualquier persona)
 * 4. La URL /exec debe ser la misma que ya está en WEBAPP_URL de los componentes React
 *    (si haces "Nueva implementación" en vez de "Nueva versión" te va a dar una URL distinta
 *    y tendrías que actualizarla en el código del front).
 *
 * GENERAR ENLACES:
 *  - Veterinario: menú "Selección" (como antes).
 *  - Peluquería: menú "Selección" -> ítems que empiezan con "Peluquería ·",
 *    trabajan sobre la hoja "Candidatos - Peluqueria" (se crea sola con encabezados):
 *      Nombre | Email | Resultado llamada | Link inicial | Enviar inicial | Link estilo | Link técnica | Enviar tests
 *    Flujo: llenas Nombre (y Email cuando lo tengas) -> "Generar cuestionario inicial (todos)"
 *    -> marca "Enviar inicial"="Sí" -> "Enviar cuestionario inicial" -> cuando pase, escribe
 *    "Pasa" en "Resultado llamada" -> "Generar enlaces en lote (los que pasaron)" -> marca
 *    "Enviar tests"="Sí" -> "Enviar tests".
 *
 * REACTIVAR una prueba (falla técnica): en la hoja "Tokens", cambia Estado a "nuevo".
 */

const FRONT_URL = "https://pet-station-tests.vercel.app/"; // <-- tu dominio del front
const REQUIRE_TOKEN = true;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Selección")
    .addItem("Generar enlace de prueba", "crearEnlaceUI")
    .addItem("Generar enlaces en lote (los que pasaron)", "generarEnlacesLote")
    .addItem("Generar cuestionario inicial (todos)", "generarEnlacesInicial")
    .addItem("Enviar cuestionario inicial (marcados con Sí)", "enviarCuestionarioInicial")
    .addItem("Enviar tests (marcados con Sí)", "enviarTests")
    .addSeparator()
    .addItem("Peluquería · Generar cuestionario inicial (todos)", "generarEnlacesInicialPeluqueria")
    .addItem("Peluquería · Generar enlaces en lote (los que pasaron)", "generarEnlacesLotePeluqueria")
    .addItem("Peluquería · Enviar cuestionario inicial (marcados con Sí)", "enviarCuestionarioInicialPeluqueria")
    .addItem("Peluquería · Enviar tests (marcados con Sí)", "enviarTestsPeluqueria")
    .addToUi();
}

// ---------- ENDPOINTS ----------
function doGet(e) {
  const p = e.parameter || {};
  if (p.action === "check") return reply(checkToken(p.token, p.tipo), p.callback);
  return reply({ ok: true, msg: "activo" }, p.callback);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.tipo === "estilo") data.tipo = "perfil";

    const tok = data.token;
    let cargo = "veterinario";
    if (REQUIRE_TOKEN) {
      if (!tok) return reply({ ok: false, reason: "sin_token" });
      const chk = findToken(tok, data.tipo);
      if (!chk.found) return reply({ ok: false, reason: "no_existe" });
      if (chk.estado === "usada") return reply({ ok: false, reason: "usada" });
      if (!chk.tipoOk) return reply({ ok: false, reason: "tipo_incorrecto" });
      marcarUsada(chk.row, data.tiempoSeg);
      cargo = chk.cargo || cargo;
    }
    data.cargo = cargo; // el cargo SIEMPRE se toma del token, no de lo que mande el front

    if (data.tipo === "tecnica") {
      guardarTecnica(data);
    } else if (data.tipo === "inicial") {
      guardarInicial(data);
    } else if (data.tipo === "perfil") {
      guardarPerfil(data);
    }

    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

// ---------- TOKENS ----------
function tokensSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName("Tokens");
  if (!s) {
    s = ss.insertSheet("Tokens");
    s.appendRow(["Token", "Tipo", "Nombre", "Email", "Estado", "Creado", "Usado", "Tiempo (seg)", "Cargo"]);
  } else {
    // migración suave: si la hoja ya existía sin columna "Cargo", la agrega
    const lastCol = Math.max(s.getLastColumn(), 9);
    const headers = s.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers[8] !== "Cargo") s.getRange(1, 9).setValue("Cargo");
  }
  return s;
}

function findToken(token, tipo) {
  const s = tokensSheet();
  const vals = s.getDataRange().getValues();

  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(token)) {
      const rowTipo = String(vals[i][1]).toLowerCase();
      const targetTipo = String(tipo || "").toLowerCase();

      // Permitir equivalencia entre "estilo" y "perfil"
      const esPerfilOEstilo =
        (targetTipo === "perfil" || targetTipo === "estilo") &&
        (rowTipo === "perfil" || rowTipo === "estilo");

      const tipoValido = !tipo || rowTipo === targetTipo || rowTipo === "ambas" || esPerfilOEstilo;

      return {
        found: true,
        row: i + 1,
        estado: String(vals[i][4]).toLowerCase(),
        nombre: vals[i][2],
        email: vals[i][3],
        tipoOk: tipoValido,
        cargo: String(vals[i][8] || "veterinario").toLowerCase()
      };
    }
  }
  return { found: false };
}

function checkToken(token, tipo) {
  if (!token) return { ok: true, valid: false, reason: "sin_token" };
  const t = findToken(token, tipo);
  if (!t.found) return { ok: true, valid: false, reason: "no_existe" };
  if (t.estado === "usada") return { ok: true, valid: false, reason: "usada", nombre: t.nombre, email: t.email };
  if (!t.tipoOk) return { ok: true, valid: false, reason: "tipo_incorrecto" };
  return { ok: true, valid: true, nombre: t.nombre, email: t.email, cargo: t.cargo };
}

function marcarUsada(row, tiempoSeg) {
  const s = tokensSheet();
  s.getRange(row, 5).setValue("usada");
  s.getRange(row, 7).setValue(new Date());
  if (tiempoSeg) s.getRange(row, 8).setValue(tiempoSeg);
}

function crearToken(nombre, email, tipo, cargo) {
  const cargoFinal = String(cargo || "veterinario").trim().toLowerCase();
  const token = Utilities.getUuid().replace(/-/g, "").slice(0, 12);
  tokensSheet().appendRow([token, tipo, nombre || "", email || "", "nuevo", new Date(), "", "", cargoFinal]);

  const esPeluqueria = cargoFinal === "peluqueria";
  let ruta;
  if (tipo === "tecnica") ruta = esPeluqueria ? "/peluqueria-tecnica" : "/tecnica";
  else if (tipo === "inicial") ruta = esPeluqueria ? "/peluqueria-inicial" : "/inicial";
  else ruta = "/estilo"; // el test de estilo es el mismo para cualquier cargo

  const base = FRONT_URL.replace(/\/+$/, ""); // sin "/" final, para no duplicarla con "ruta"
  return base + ruta + "?token=" + token;
}

// ---------- GUARDAR RESULTADOS ----------
function guardarInicial(data) {
  if (data.cargo === "peluqueria") {
    const s = hoja("Postulaciones - Peluqueria", [
      "Fecha", "Nombre", "Email", "Token",
      "Experiencia previa en grooming", "Años de experiencia", "Certificaciones/cursos",
      "Cómodo lunes a sábado (turnos)", "Ubicación", "Expectativa salarial", "Justificación",
      "Puede empezar", "Cómodo con", "Banderas"
    ]);
    const flags = [];
    if (String(data.comodoLunesSabado) !== "Sí") flags.push("No cómodo con turnos de lunes a sábado");
    if (String(data.experienciaPrevia) !== "Sí") flags.push("Sin experiencia previa en grooming");
    s.appendRow([
      data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
      data.experienciaPrevia || "", data.aniosExp || "", data.certificaciones || "",
      data.comodoLunesSabado || "", data.ubicacion || "", data.salario || "", data.sustentoSalario || "",
      data.inicio || "", (data.comodidad || []).join(", "), flags.length ? flags.join(" · ") : "OK"
    ]);
    return;
  }

  // ---- rama original: veterinario ----
  const s = hoja("Postulaciones", [
    "Fecha", "Nombre", "Email", "Token",
    "Tarjeta vigente", "Tarjeta Profesional", "Años experiencia", "Disponible sáb/dom",
    "Ubicación", "Expectativa salarial", "Justificación", "Puede empezar", "Cómodo con", "Banderas"
  ]);
  const flags = [];
  if (String(data.tarjeta) !== "Sí") flags.push("Sin tarjeta vigente");
  if (String(data.disponibleFinde) !== "Sí") flags.push("No disponible fin de semana");
  s.appendRow([
    data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
    data.tarjeta || "", data.tarProf || "", data.aniosExp || "", data.disponibleFinde || "",
    data.ubicacion || "", data.salario || "", data.sustentoSalario || "", data.inicio || "",
    (data.comodidad || []).join(", "), flags.length ? flags.join(" · ") : "OK"
  ]);
}

function guardarPerfil(data) {
  const s = hoja("Perfiles", [
    "Fecha", "Nombre", "Email", "Token", "Tiempo (seg)",
    "Cognitivo (media)", "Cognitivo (tendencia)",
    "Orden (media)", "Orden (tendencia)",
    "Personas (media)", "Personas (tendencia)",
    "Presión (media)", "Presión (tendencia)",
    "Iniciativa (media)", "Iniciativa (tendencia)",
    "Resumen", "Respuestas (JSON)", "Cargo"
  ]);

  // migración suave si la hoja ya existía sin columna "Cargo"
  const headers = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  if (headers.indexOf("Cargo") === -1) s.getRange(1, headers.length + 1).setValue("Cargo");

  const d = data.dimensiones || {};
  const cell = (k) => {
    if (d[k]) return [d[k].media !== undefined ? d[k].media : "", d[k].tendencia || ""];
    return ["", ""];
  };

  s.appendRow([
    data.fecha || new Date().toISOString(),
    data.nombre || "",
    data.email || "",
    data.token || "",
    data.tiempoSeg || "",
    ...cell("cognitivo"),
    ...cell("orden"),
    ...cell("personas"),
    ...cell("presion"),
    ...cell("iniciativa"),
    data.resumen || "",
    JSON.stringify(data.respuestas || {}),
    data.cargo || "veterinario"
  ]);
}

function guardarTecnica(data) {
  if (data.cargo === "peluqueria") {
    const s = hoja("Pruebas - Peluqueria", [
      "Fecha", "Nombre", "Email", "Token", "Tiempo (seg)", "Auto-enviado",
      "Puntaje objetivo", "Total", "% Objetivo",
      "Detalle cálculo (JSON)", "Detalle higiene/equipo (JSON)", "Detalle comportamiento animal (JSON)",
      "Casos (JSON)", "Respuestas abiertas (JSON)"
    ]);
    const pct = data.total ? Math.round((data.puntaje / data.total) * 100) : "";
    s.appendRow([
      data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
      data.tiempoSeg || "", data.autoenviado ? "Sí" : "No",
      data.puntaje, data.total, pct,
      JSON.stringify(data.detalleCalc || {}),
      JSON.stringify(data.detalleHigiene || {}),
      JSON.stringify(data.detalleComportamiento || {}),
      JSON.stringify(data.casos || {}),
      JSON.stringify(data.abiertas || {})
    ]);
    return;
  }

  // ---- rama original: veterinario ----
  const s = hoja("Pruebas", [
    "Fecha", "Nombre", "Email", "Token", "Tiempo (seg)", "Auto-enviado",
    "Puntaje objetivo", "Total", "% Objetivo",
    "Detalle cálculo (JSON)", "Detalle opción múltiple (JSON)", "Detalle gestión (JSON)",
    "Casos clínicos (JSON)", "Respuestas abiertas (JSON)"
  ]);
  const pct = data.total ? Math.round((data.puntaje / data.total) * 100) : "";
  s.appendRow([
    data.fecha || new Date().toISOString(), data.nombre || "", data.email || "", data.token || "",
    data.tiempoSeg || "", data.autoenviado ? "Sí" : "No",
    data.puntaje, data.total, pct,
    JSON.stringify(data.detalleCalc || {}),
    JSON.stringify(data.detalleMCQ || {}),
    JSON.stringify(data.detalleGestion || {}),
    JSON.stringify(data.casosClinicos || {}),
    JSON.stringify(data.abiertas || {})
  ]);
}

function hoja(nombre, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(nombre);
  if (!s) { s = ss.insertSheet(nombre); s.appendRow(headers); }
  return s;
}

function reply(obj, callback) {
  const body = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(callback + "(" + body + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ---------- MENÚ: generar enlace individual (cualquier cargo) ----------
function crearEnlaceUI() {
  const ui = SpreadsheetApp.getUi();
  const n = ui.prompt("Generar enlace", "Nombre del candidato:", ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  const em = ui.prompt("Generar enlace", "Correo del candidato:", ui.ButtonSet.OK_CANCEL);
  if (em.getSelectedButton() !== ui.Button.OK) return;
  const cg = ui.prompt("Generar enlace", "Cargo: veterinario / peluqueria", ui.ButtonSet.OK_CANCEL);
  if (cg.getSelectedButton() !== ui.Button.OK) return;
  const tp = ui.prompt("Generar enlace", "Tipo: inicial / estilo / tecnica / ambas (estilo+tecnica)", ui.ButtonSet.OK_CANCEL);
  if (tp.getSelectedButton() !== ui.Button.OK) return;
  const nombre = n.getResponseText().trim();
  const email = em.getResponseText().trim();
  const cargo = cg.getResponseText().trim().toLowerCase();
  const tipo = tp.getResponseText().trim().toLowerCase();

  let msg = "";
  if (tipo === "ambas") {
    msg = "Estilo:\n" + crearToken(nombre, email, "estilo", cargo) + "\n\nTécnica:\n" + crearToken(nombre, email, "tecnica", cargo);
  } else if (tipo === "estilo" || tipo === "tecnica" || tipo === "inicial") {
    msg = crearToken(nombre, email, tipo, cargo);
  } else {
    ui.alert("Tipo no válido. Usa: inicial, estilo, tecnica o ambas."); return;
  }
  ui.alert("Enlace(s) para " + nombre + " (" + cargo + "):\n\n" + msg + "\n\n(También quedaron en la hoja Tokens)");
}

// ---------- MENÚ: generar enlaces en lote — VETERINARIO (sin cambios de comportamiento) ----------
function generarEnlacesLote() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("Candidatos");
  if (!s) { ui.alert('No encontré la hoja "Candidatos".'); return; }

  const COL_NOMBRE = 2, COL_RESULTADO = 15, COL_LINK_E = 28, COL_LINK_T = 29;

  if (!s.getRange(1, COL_LINK_E).getValue()) s.getRange(1, COL_LINK_E).setValue("Link estilo");
  if (!s.getRange(1, COL_LINK_T).getValue()) s.getRange(1, COL_LINK_T).setValue("Link técnica");

  const last = s.getLastRow();
  if (last < 2) { ui.alert("No hay candidatos en la hoja."); return; }

  const rows = s.getRange(2, 1, last - 1, COL_LINK_T).getValues();
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const resultado = String(rows[i][COL_RESULTADO - 1]).trim().toLowerCase();
    const yaTiene = String(rows[i][COL_LINK_E - 1]).trim();
    if (nombre && resultado === "pasa" && !yaTiene) {
      const le = crearToken(nombre, "", "estilo", "veterinario");
      const lt = crearToken(nombre, "", "tecnica", "veterinario");
      s.getRange(fila, COL_LINK_E).setValue(le);
      s.getRange(fila, COL_LINK_T).setValue(lt);
      n++;
    }
  }
  ui.alert(n > 0
    ? "Generé enlaces para " + n + " candidato(s). Quedaron en las columnas \"Link estilo\" y \"Link técnica\", y los tokens en la hoja \"Tokens\"."
    : "No había candidatos nuevos con Resultado llamada = \"Pasa\" sin enlace.");
}

function generarEnlacesInicial() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("Candidatos");
  if (!s) { ui.alert('No encontré la hoja "Candidatos".'); return; }

  const COL_NOMBRE = 2, COL_LINK_I = 30;
  if (!s.getRange(1, COL_LINK_I).getValue()) s.getRange(1, COL_LINK_I).setValue("Link inicial");

  const last = s.getLastRow();
  if (last < 2) { ui.alert("No hay candidatos en la hoja."); return; }

  const rows = s.getRange(2, 1, last - 1, COL_LINK_I).getValues();
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const yaTiene = String(rows[i][COL_LINK_I - 1]).trim();
    if (nombre && !yaTiene) {
      s.getRange(fila, COL_LINK_I).setValue(crearToken(nombre, "", "inicial", "veterinario"));
      n++;
    }
  }
  ui.alert(n > 0
    ? "Generé el cuestionario inicial para " + n + " candidato(s). Quedaron en la columna \"Link inicial\"."
    : "Todos los candidatos ya tenían enlace de cuestionario inicial.");
}

// ---------- MENÚ: PELUQUERÍA — hoja "Candidatos - Peluqueria" (se crea sola) ----------
// Columnas: 1 Nombre | 2 Email | 3 Resultado llamada | 4 Link inicial | 5 Enviar inicial
//           | 6 Link estilo | 7 Link técnica | 8 Enviar tests
function candidatosPeluqueriaSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName("Candidatos - Peluqueria");
  if (!s) {
    s = ss.insertSheet("Candidatos - Peluqueria");
    s.appendRow(["Nombre", "Email", "Resultado llamada", "Link inicial", "Enviar inicial", "Link estilo", "Link técnica", "Enviar tests"]);
  }
  return s;
}

function generarEnlacesInicialPeluqueria() {
  const ui = SpreadsheetApp.getUi();
  const s = candidatosPeluqueriaSheet();
  const COL_NOMBRE = 1, COL_LINK_I = 4;

  const last = s.getLastRow();
  if (last < 2) { ui.alert('Agrega candidatos (columna Nombre) en la hoja "Candidatos - Peluqueria" y vuelve a intentarlo.'); return; }

  const rows = s.getRange(2, 1, last - 1, COL_LINK_I).getValues();
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const yaTiene = String(rows[i][COL_LINK_I - 1]).trim();
    if (nombre && !yaTiene) {
      s.getRange(fila, COL_LINK_I).setValue(crearToken(nombre, "", "inicial", "peluqueria"));
      n++;
    }
  }
  ui.alert(n > 0
    ? "Generé el cuestionario inicial para " + n + " candidato(s) de peluquería. Quedó en la columna \"Link inicial\"."
    : "Todos los candidatos ya tenían enlace de cuestionario inicial.");
}

function generarEnlacesLotePeluqueria() {
  const ui = SpreadsheetApp.getUi();
  const s = candidatosPeluqueriaSheet();
  const COL_NOMBRE = 1, COL_RESULTADO = 3, COL_LINK_E = 6, COL_LINK_T = 7;

  const last = s.getLastRow();
  if (last < 2) { ui.alert("No hay candidatos en la hoja."); return; }

  const rows = s.getRange(2, 1, last - 1, COL_LINK_T).getValues();
  let n = 0;
  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const resultado = String(rows[i][COL_RESULTADO - 1]).trim().toLowerCase();
    const yaTiene = String(rows[i][COL_LINK_E - 1]).trim();
    if (nombre && resultado === "pasa" && !yaTiene) {
      s.getRange(fila, COL_LINK_E).setValue(crearToken(nombre, "", "estilo", "peluqueria"));
      s.getRange(fila, COL_LINK_T).setValue(crearToken(nombre, "", "tecnica", "peluqueria"));
      n++;
    }
  }
  ui.alert(n > 0
    ? "Generé enlaces para " + n + " candidato(s) de peluquería. Quedaron en \"Link estilo\" y \"Link técnica\"."
    : "No había candidatos nuevos con Resultado llamada = \"Pasa\" sin enlace.");
}

// ---------- ENVÍO DE CORREO — VETERINARIO (idéntico a como estaba) ----------
const EMAIL_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Postulación — Pet Station</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:#EEF1F8; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  .btn:hover { background:#0f1f5c !important; }
  @media (max-width:620px){ .container{ width:100% !important; } .px{ padding-left:26px !important; padding-right:26px !important; } }
</style>
</head>
<body style="margin:0; padding:0; background:#EEF1F8; font-family:'Poppins', Arial, Helvetica, sans-serif;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#EEF1F8; font-size:1px; line-height:1px;">
    ¡Gracias por postularte! Completa este cuestionario de 2 minutos para iniciar tu proceso.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F8;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 12px 40px rgba(20,33,61,0.10);">

          <tr><td style="height:5px; background:#DE1F27; line-height:5px; font-size:5px;">&nbsp;</td></tr>

          <tr>
            <td align="center" style="background:#152C77; padding:34px 30px 30px 30px;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:26px; font-weight:700; color:#FFFFFF; letter-spacing:0.5px;">Pet Station</div>
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:500; color:#AEB9E0; letter-spacing:3px; text-transform:uppercase; margin-top:6px;">Proceso de selección</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:40px 44px 12px 44px;">
              <h1 style="margin:0 0 18px 0; font-family:'Poppins',Arial,sans-serif; font-size:24px; font-weight:600; color:#152C77; line-height:1.25;">¡Hola, [NOMBRE]!</h1>
              <p style="margin:0 0 16px 0; font-family:'Poppins',Arial,sans-serif; font-size:15px; line-height:1.7; color:#3F4A63;">
                Agradecemos mucho que quieras formar parte de nuestro equipo. Nos encantó recibir tu interés en la vacante de <strong style="color:#152C77;">Médico Veterinario</strong>.
              </p>
              <p style="margin:0 0 26px 0; font-family:'Poppins',Arial,sans-serif; font-size:15px; line-height:1.7; color:#3F4A63;">
                Para iniciar tu proceso, te pedimos responder un breve cuestionario. Te tomará alrededor de <strong>2 minutos</strong> y nos ayuda a conocerte mejor antes de los siguientes pasos.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:4px 44px 30px 44px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#152C77" style="border-radius:12px;">
                    <a class="btn" href="[ENLACE]" target="_blank"
                      style="display:inline-block; padding:15px 40px; font-family:'Poppins',Arial,sans-serif; font-size:15px; font-weight:600; color:#FFFFFF; background:#152C77; border-radius:12px;">
                      Responder cuestionario &nbsp;→
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:0 44px 36px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB; border-radius:14px;">
                <tr>
                  <td style="padding:16px 20px; font-family:'Poppins',Arial,sans-serif; font-size:13px; line-height:1.6; color:#5A6782;">
                    Este enlace es <strong style="color:#152C77;">personal</strong> y de un solo uso. Te sugerimos responderlo en los próximos <strong>2 días</strong>.
                    <br>Si el botón no funciona, copia este enlace en tu navegador:<br>
                    <span style="color:#2563EB; word-break:break-all;">[ENLACE]</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="background:#F4F6FB; padding:24px 30px; border-top:1px solid #E2E7F1;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:12px; color:#8A93A8; line-height:1.6;">
                ¿Dudas? Escríbenos a <a href="mailto:community.manager@petstationvet.com" style="color:#2563EB;">community.manager@petstationvet.com</a><br>
                Pet Station · Chía, Cundinamarca
              </div>
            </td>
          </tr>

        </table>

        <div style="font-family:'Poppins',Arial,sans-serif; font-size:11px; color:#AAB2C4; margin-top:18px;">Recibiste este correo porque te postulaste a nuestra vacante.</div>

      </td>
    </tr>
  </table>

</body>
</html>
`;

const EMAIL_TESTS_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Siguiente etapa — Pet Station</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:#EEF1F8; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  .btnfill:hover { background:#0f1f5c !important; }
  @media (max-width:620px){ .container{ width:100% !important; } .px{ padding-left:26px !important; padding-right:26px !important; } }
</style>
</head>
<body style="margin:0; padding:0; background:#EEF1F8; font-family:'Poppins', Arial, Helvetica, sans-serif;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#EEF1F8; font-size:1px; line-height:1px;">
    ¡Felicidades! Avanzas a la siguiente etapa. Completa estas dos evaluaciones para continuar.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F8;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 12px 40px rgba(20,33,61,0.10);">

          <tr><td style="height:5px; background:#DE1F27; line-height:5px; font-size:5px;">&nbsp;</td></tr>

          <tr>
            <td align="center" style="background:#152C77; padding:34px 30px 30px 30px;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:26px; font-weight:700; color:#FFFFFF; letter-spacing:0.5px;">Pet Station</div>
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:500; color:#AEB9E0; letter-spacing:3px; text-transform:uppercase; margin-top:6px;">Proceso de selección</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:40px 44px 8px 44px;">
              <div style="display:inline-block; background:#EAF2E3; color:#3F7A1E; font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; padding:6px 14px; border-radius:20px; margin-bottom:16px;">Avanzaste a la siguiente etapa</div>
              <h1 style="margin:0 0 18px 0; font-family:'Poppins',Arial,sans-serif; font-size:24px; font-weight:600; color:#152C77; line-height:1.25;">¡Felicidades, [NOMBRE]!</h1>
              <p style="margin:0 0 16px 0; font-family:'Poppins',Arial,sans-serif; font-size:15px; line-height:1.7; color:#3F4A63;">
                Nos gustó tu perfil y queremos seguir adelante contigo. En esta etapa te pedimos completar <strong style="color:#152C77;">dos evaluaciones</strong>. Con tus resultados coordinamos la entrevista.
              </p>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:14px 44px 6px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB; border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:15px; font-weight:600; color:#152C77;">1 · Evaluación de estilo de trabajo</div>
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:13px; color:#5A6782; margin:4px 0 14px 0;">15 preguntas · unos 5 minutos · sin respuestas correctas</div>
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td align="center" bgcolor="#152C77" style="border-radius:10px;">
                        <a class="btnfill" href="[ENLACE_ESTILO]" target="_blank" style="display:inline-block; padding:12px 30px; font-family:'Poppins',Arial,sans-serif; font-size:14px; font-weight:600; color:#FFFFFF; background:#152C77; border-radius:10px;">Comenzar &nbsp;→</a>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:6px 44px 20px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB; border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:15px; font-weight:600; color:#152C77;">2 · Prueba técnica</div>
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:13px; color:#5A6782; margin:4px 0 14px 0;">Cálculo de dosis, farmacología y casos · 40 minutos desde que inicias</div>
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td align="center" bgcolor="#152C77" style="border-radius:10px;">
                        <a class="btnfill" href="[ENLACE_TECNICA]" target="_blank" style="display:inline-block; padding:12px 30px; font-family:'Poppins',Arial,sans-serif; font-size:14px; font-weight:600; color:#FFFFFF; background:#152C77; border-radius:10px;">Comenzar &nbsp;→</a>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:0 44px 34px 44px;">
              <p style="margin:0; font-family:'Poppins',Arial,sans-serif; font-size:12px; line-height:1.6; color:#8A93A8;">
                Los enlaces son <strong style="color:#152C77;">personales</strong> y de un solo uso. La prueba técnica tiene un tiempo de 40 minutos que corre desde que la inicias, así que empiézala cuando tengas ese rato disponible.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="background:#F4F6FB; padding:24px 30px; border-top:1px solid #E2E7F1;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:12px; color:#8A93A8; line-height:1.6;">
                ¿Dudas? Escríbenos a <a href="mailto:community.manager@petstationvet.com" style="color:#2563EB;">community.manager@petstationvet.com</a><br>
                Pet Station · Chía, Cundinamarca
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

function enviarCuestionarioInicial() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("Candidatos");
  if (!s) { ui.alert('No encontré la hoja "Candidatos".'); return; }

  const COL_NOMBRE = 2, COL_LINK_I = 30, COL_EMAIL = 31, COL_ENVIAR = 32;
  if (!s.getRange(1, COL_EMAIL).getValue()) s.getRange(1, COL_EMAIL).setValue("Email");
  if (!s.getRange(1, COL_ENVIAR).getValue()) s.getRange(1, COL_ENVIAR).setValue("Enviar inicial");

  const last = s.getLastRow();
  if (last < 2) { ui.alert("No hay candidatos."); return; }

  const rows = s.getRange(2, 1, last - 1, COL_ENVIAR).getValues();
  let enviados = 0, saltados = 0;
  const problemas = [];

  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const link = String(rows[i][COL_LINK_I - 1]).trim();
    const email = String(rows[i][COL_EMAIL - 1]).trim();
    const marca = String(rows[i][COL_ENVIAR - 1]).trim().toLowerCase();

    if (marca !== "sí" && marca !== "si") continue;
    if (!email) { problemas.push(nombre + " (sin email)"); saltados++; continue; }
    if (!link) { problemas.push(nombre + " (sin link inicial)"); saltados++; continue; }

    const primerNombre = nombre.split(" ")[0] || nombre;
    const html = EMAIL_HTML.replace(/\[NOMBRE\]/g, primerNombre).replace(/\[ENLACE\]/g, link);

    MailApp.sendEmail({ to: email, subject: "Iniciemos tu proceso — Pet Station", htmlBody: html, name: "Pet Station" });

    s.getRange(fila, COL_ENVIAR).setValue("Enviado " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"));
    enviados++;
  }

  let msg = "Correos enviados: " + enviados + ".";
  if (saltados) msg += "\nSaltados: " + saltados + " -> " + problemas.join(", ");
  if (!enviados && !saltados) msg += "\n\n(Marca con \"Sí\" en la columna \"Enviar inicial\" a quién quieres enviarle.)";
  ui.alert(msg);
}

function enviarTests() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("Candidatos");
  if (!s) { ui.alert('No encontré la hoja "Candidatos".'); return; }

  const COL_NOMBRE = 2, COL_LINK_E = 28, COL_LINK_T = 29, COL_EMAIL = 31, COL_ENVIAR_T = 33;
  if (!s.getRange(1, COL_EMAIL).getValue()) s.getRange(1, COL_EMAIL).setValue("Email");
  if (!s.getRange(1, COL_ENVIAR_T).getValue()) s.getRange(1, COL_ENVIAR_T).setValue("Enviar tests");

  const last = s.getLastRow();
  if (last < 2) { ui.alert("No hay candidatos."); return; }

  const rows = s.getRange(2, 1, last - 1, COL_ENVIAR_T).getValues();
  let enviados = 0, saltados = 0;
  const problemas = [];

  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const linkE = String(rows[i][COL_LINK_E - 1]).trim();
    const linkT = String(rows[i][COL_LINK_T - 1]).trim();
    const email = String(rows[i][COL_EMAIL - 1]).trim();
    const marca = String(rows[i][COL_ENVIAR_T - 1]).trim().toLowerCase();

    if (marca !== "sí" && marca !== "si") continue;
    if (!email) { problemas.push(nombre + " (sin email)"); saltados++; continue; }
    if (!linkE || !linkT) { problemas.push(nombre + " (falta link estilo/técnica)"); saltados++; continue; }

    const primerNombre = nombre.split(" ")[0] || nombre;
    const html = EMAIL_TESTS_HTML
      .replace(/\[NOMBRE\]/g, primerNombre)
      .replace(/\[ENLACE_ESTILO\]/g, linkE)
      .replace(/\[ENLACE_TECNICA\]/g, linkT);

    MailApp.sendEmail({ to: email, subject: "¡Avanzas a la siguiente etapa! — Pet Station", htmlBody: html, name: "Pet Station" });

    s.getRange(fila, COL_ENVIAR_T).setValue("Enviado " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"));
    enviados++;
  }

  let msg = "Correos de tests enviados: " + enviados + ".";
  if (saltados) msg += "\nSaltados: " + saltados + " -> " + problemas.join(", ");
  if (!enviados && !saltados) msg += "\n\n(Marca con \"Sí\" en la columna \"Enviar tests\" a quién quieres enviarle.)";
  ui.alert(msg);
}

// ---------- ENVÍO DE CORREO — PELUQUERÍA (mismo diseño, texto del cargo) ----------
const EMAIL_HTML_PELUQUERIA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Postulación — Pet Station</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:#EEF1F8; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  .btn:hover { background:#0f1f5c !important; }
  @media (max-width:620px){ .container{ width:100% !important; } .px{ padding-left:26px !important; padding-right:26px !important; } }
</style>
</head>
<body style="margin:0; padding:0; background:#EEF1F8; font-family:'Poppins', Arial, Helvetica, sans-serif;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#EEF1F8; font-size:1px; line-height:1px;">
    ¡Gracias por postularte! Completa este cuestionario de 2 minutos para iniciar tu proceso.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F8;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 12px 40px rgba(20,33,61,0.10);">

          <tr><td style="height:5px; background:#DE1F27; line-height:5px; font-size:5px;">&nbsp;</td></tr>

          <tr>
            <td align="center" style="background:#152C77; padding:34px 30px 30px 30px;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:26px; font-weight:700; color:#FFFFFF; letter-spacing:0.5px;">Pet Station</div>
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:500; color:#AEB9E0; letter-spacing:3px; text-transform:uppercase; margin-top:6px;">Proceso de selección</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:40px 44px 12px 44px;">
              <h1 style="margin:0 0 18px 0; font-family:'Poppins',Arial,sans-serif; font-size:24px; font-weight:600; color:#152C77; line-height:1.25;">¡Hola, [NOMBRE]!</h1>
              <p style="margin:0 0 16px 0; font-family:'Poppins',Arial,sans-serif; font-size:15px; line-height:1.7; color:#3F4A63;">
                Agradecemos mucho que quieras formar parte de nuestro equipo. Nos encantó recibir tu interés en la vacante de <strong style="color:#152C77;">Peluquero(a) Canino/Felino</strong>.
              </p>
              <p style="margin:0 0 26px 0; font-family:'Poppins',Arial,sans-serif; font-size:15px; line-height:1.7; color:#3F4A63;">
                Para iniciar tu proceso, te pedimos responder un breve cuestionario. Te tomará alrededor de <strong>2 minutos</strong> y nos ayuda a conocerte mejor antes de los siguientes pasos.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:4px 44px 30px 44px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#152C77" style="border-radius:12px;">
                    <a class="btn" href="[ENLACE]" target="_blank"
                      style="display:inline-block; padding:15px 40px; font-family:'Poppins',Arial,sans-serif; font-size:15px; font-weight:600; color:#FFFFFF; background:#152C77; border-radius:12px;">
                      Responder cuestionario &nbsp;→
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:0 44px 36px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB; border-radius:14px;">
                <tr>
                  <td style="padding:16px 20px; font-family:'Poppins',Arial,sans-serif; font-size:13px; line-height:1.6; color:#5A6782;">
                    Este enlace es <strong style="color:#152C77;">personal</strong> y de un solo uso. Te sugerimos responderlo en los próximos <strong>2 días</strong>.
                    <br>Si el botón no funciona, copia este enlace en tu navegador:<br>
                    <span style="color:#2563EB; word-break:break-all;">[ENLACE]</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="background:#F4F6FB; padding:24px 30px; border-top:1px solid #E2E7F1;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:12px; color:#8A93A8; line-height:1.6;">
                ¿Dudas? Escríbenos a <a href="mailto:community.manager@petstationvet.com" style="color:#2563EB;">community.manager@petstationvet.com</a><br>
                Pet Station · Chía, Cundinamarca
              </div>
            </td>
          </tr>

        </table>

        <div style="font-family:'Poppins',Arial,sans-serif; font-size:11px; color:#AAB2C4; margin-top:18px;">Recibiste este correo porque te postulaste a nuestra vacante.</div>

      </td>
    </tr>
  </table>

</body>
</html>
`;

const EMAIL_TESTS_HTML_PELUQUERIA = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Siguiente etapa — Pet Station</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:#EEF1F8; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  .btnfill:hover { background:#0f1f5c !important; }
  @media (max-width:620px){ .container{ width:100% !important; } .px{ padding-left:26px !important; padding-right:26px !important; } }
</style>
</head>
<body style="margin:0; padding:0; background:#EEF1F8; font-family:'Poppins', Arial, Helvetica, sans-serif;">

  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#EEF1F8; font-size:1px; line-height:1px;">
    ¡Felicidades! Avanzas a la siguiente etapa. Completa estas dos evaluaciones para continuar.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F8;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 12px 40px rgba(20,33,61,0.10);">

          <tr><td style="height:5px; background:#DE1F27; line-height:5px; font-size:5px;">&nbsp;</td></tr>

          <tr>
            <td align="center" style="background:#152C77; padding:34px 30px 30px 30px;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:26px; font-weight:700; color:#FFFFFF; letter-spacing:0.5px;">Pet Station</div>
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:500; color:#AEB9E0; letter-spacing:3px; text-transform:uppercase; margin-top:6px;">Proceso de selección</div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:40px 44px 8px 44px;">
              <div style="display:inline-block; background:#EAF2E3; color:#3F7A1E; font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; padding:6px 14px; border-radius:20px; margin-bottom:16px;">Avanzaste a la siguiente etapa</div>
              <h1 style="margin:0 0 18px 0; font-family:'Poppins',Arial,sans-serif; font-size:24px; font-weight:600; color:#152C77; line-height:1.25;">¡Felicidades, [NOMBRE]!</h1>
              <p style="margin:0 0 16px 0; font-family:'Poppins',Arial,sans-serif; font-size:15px; line-height:1.7; color:#3F4A63;">
                Nos gustó tu perfil y queremos seguir adelante contigo. En esta etapa te pedimos completar <strong style="color:#152C77;">dos evaluaciones</strong>. Con tus resultados coordinamos la entrevista.
              </p>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:14px 44px 6px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB; border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:15px; font-weight:600; color:#152C77;">1 · Evaluación de estilo de trabajo</div>
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:13px; color:#5A6782; margin:4px 0 14px 0;">15 preguntas · unos 5 minutos · sin respuestas correctas</div>
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td align="center" bgcolor="#152C77" style="border-radius:10px;">
                        <a class="btnfill" href="[ENLACE_ESTILO]" target="_blank" style="display:inline-block; padding:12px 30px; font-family:'Poppins',Arial,sans-serif; font-size:14px; font-weight:600; color:#FFFFFF; background:#152C77; border-radius:10px;">Comenzar &nbsp;→</a>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:6px 44px 20px 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB; border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:15px; font-weight:600; color:#152C77;">2 · Prueba técnica</div>
                    <div style="font-family:'Poppins',Arial,sans-serif; font-size:13px; color:#5A6782; margin:4px 0 14px 0;">Higiene, manejo animal, casos y servicio al cliente · 35 minutos desde que inicias</div>
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td align="center" bgcolor="#152C77" style="border-radius:10px;">
                        <a class="btnfill" href="[ENLACE_TECNICA]" target="_blank" style="display:inline-block; padding:12px 30px; font-family:'Poppins',Arial,sans-serif; font-size:14px; font-weight:600; color:#FFFFFF; background:#152C77; border-radius:10px;">Comenzar &nbsp;→</a>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:0 44px 34px 44px;">
              <p style="margin:0; font-family:'Poppins',Arial,sans-serif; font-size:12px; line-height:1.6; color:#8A93A8;">
                Los enlaces son <strong style="color:#152C77;">personales</strong> y de un solo uso. La prueba técnica tiene un tiempo de 35 minutos que corre desde que la inicias, así que empiézala cuando tengas ese rato disponible.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="background:#F4F6FB; padding:24px 30px; border-top:1px solid #E2E7F1;">
              <div style="font-family:'Poppins',Arial,sans-serif; font-size:12px; color:#8A93A8; line-height:1.6;">
                ¿Dudas? Escríbenos a <a href="mailto:community.manager@petstationvet.com" style="color:#2563EB;">community.manager@petstationvet.com</a><br>
                Pet Station · Chía, Cundinamarca
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

function enviarCuestionarioInicialPeluqueria() {
  const ui = SpreadsheetApp.getUi();
  const s = candidatosPeluqueriaSheet();
  const COL_NOMBRE = 1, COL_EMAIL = 2, COL_LINK_I = 4, COL_ENVIAR_I = 5;

  const last = s.getLastRow();
  if (last < 2) { ui.alert("No hay candidatos."); return; }

  const rows = s.getRange(2, 1, last - 1, COL_ENVIAR_I).getValues();
  let enviados = 0, saltados = 0;
  const problemas = [];

  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const email = String(rows[i][COL_EMAIL - 1]).trim();
    const link = String(rows[i][COL_LINK_I - 1]).trim();
    const marca = String(rows[i][COL_ENVIAR_I - 1]).trim().toLowerCase();

    if (marca !== "sí" && marca !== "si") continue;
    if (!email) { problemas.push(nombre + " (sin email)"); saltados++; continue; }
    if (!link) { problemas.push(nombre + " (sin link inicial)"); saltados++; continue; }

    const primerNombre = nombre.split(" ")[0] || nombre;
    const html = EMAIL_HTML_PELUQUERIA.replace(/\[NOMBRE\]/g, primerNombre).replace(/\[ENLACE\]/g, link);

    MailApp.sendEmail({ to: email, subject: "Iniciemos tu proceso — Pet Station", htmlBody: html, name: "Pet Station" });

    s.getRange(fila, COL_ENVIAR_I).setValue("Enviado " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"));
    enviados++;
  }

  let msg = "Correos enviados: " + enviados + ".";
  if (saltados) msg += "\nSaltados: " + saltados + " -> " + problemas.join(", ");
  if (!enviados && !saltados) msg += "\n\n(Marca con \"Sí\" en la columna \"Enviar inicial\" a quién quieres enviarle.)";
  ui.alert(msg);
}

function enviarTestsPeluqueria() {
  const ui = SpreadsheetApp.getUi();
  const s = candidatosPeluqueriaSheet();
  const COL_NOMBRE = 1, COL_EMAIL = 2, COL_LINK_E = 6, COL_LINK_T = 7, COL_ENVIAR_T = 8;

  const last = s.getLastRow();
  if (last < 2) { ui.alert("No hay candidatos."); return; }

  const rows = s.getRange(2, 1, last - 1, COL_ENVIAR_T).getValues();
  let enviados = 0, saltados = 0;
  const problemas = [];

  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2;
    const nombre = String(rows[i][COL_NOMBRE - 1]).trim();
    const email = String(rows[i][COL_EMAIL - 1]).trim();
    const linkE = String(rows[i][COL_LINK_E - 1]).trim();
    const linkT = String(rows[i][COL_LINK_T - 1]).trim();
    const marca = String(rows[i][COL_ENVIAR_T - 1]).trim().toLowerCase();

    if (marca !== "sí" && marca !== "si") continue;
    if (!email) { problemas.push(nombre + " (sin email)"); saltados++; continue; }
    if (!linkE || !linkT) { problemas.push(nombre + " (falta link estilo/técnica)"); saltados++; continue; }

    const primerNombre = nombre.split(" ")[0] || nombre;
    const html = EMAIL_TESTS_HTML_PELUQUERIA
      .replace(/\[NOMBRE\]/g, primerNombre)
      .replace(/\[ENLACE_ESTILO\]/g, linkE)
      .replace(/\[ENLACE_TECNICA\]/g, linkT);

    MailApp.sendEmail({ to: email, subject: "¡Avanzas a la siguiente etapa! — Pet Station", htmlBody: html, name: "Pet Station" });

    s.getRange(fila, COL_ENVIAR_T).setValue("Enviado " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"));
    enviados++;
  }

  let msg = "Correos de tests enviados: " + enviados + ".";
  if (saltados) msg += "\nSaltados: " + saltados + " -> " + problemas.join(", ");
  if (!enviados && !saltados) msg += "\n\n(Marca con \"Sí\" en la columna \"Enviar tests\" a quién quieres enviarle.)";
  ui.alert(msg);
}
