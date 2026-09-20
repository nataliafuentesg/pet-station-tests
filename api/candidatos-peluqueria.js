import { getSheetsClient, sheetId, readRowsPositional } from "./_lib/sheets.js";

// Misma clave que usa el front (src/InformePeluqueria.jsx) para el acceso del equipo.
// Cambia este valor si quieres rotar el acceso — no depende de ninguna cuenta real.
const ADMIN_KEY = "PetStationPeluqueria2026";

function normalizeName(n) {
  return String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Los índices reflejan EXACTAMENTE el orden con el que guardarInicial /
// guardarPerfil / guardarTecnica escriben cada fila (api/_lib/sheets.js) —
// no el texto de la fila 1, que en "Perfiles" (compartida con veterinario)
// alguien llegó a editar/reordenar a mano en el Sheet.

function mapInicial(row) {
  return {
    fecha: row[0] || "", nombre: row[1] || "", email: row[2] || "", token: row[3] || "",
    experienciaPrevia: row[4] || "", aniosExp: row[5] || "", certificaciones: row[6] || "",
    comodoLunesSabado: row[7] || "", ubicacion: row[8] || "", salario: row[9] || "",
    justificacion: row[10] || "", puedeEmpezar: row[11] || "", comodoCon: row[12] || "",
    banderas: row[13] || "",
  };
}

function mapEstilo(row) {
  const dim = (mediaIdx, tendIdx) => ({ media: row[mediaIdx] || "", tendencia: row[tendIdx] || "" });
  return {
    fecha: row[0] || "", nombre: row[1] || "", email: row[2] || "", token: row[3] || "", tiempoSeg: row[4] || "",
    cognitivo: dim(5, 6), orden: dim(7, 8), personas: dim(9, 10), presion: dim(11, 12), iniciativa: dim(13, 14),
    resumen: row[15] || "", cargo: String(row[17] || "veterinario").toLowerCase(),
  };
}

function mapTecnica(row) {
  return {
    fecha: row[0] || "", nombre: row[1] || "", email: row[2] || "", token: row[3] || "",
    tiempoSeg: row[4] || "", autoenviado: row[5] || "",
    puntaje: row[6] || "", total: row[7] || "", pct: row[8] || "",
    detalleHigiene: row[10] || "{}", detalleComportamiento: row[11] || "{}",
    casos: row[12] || "{}", abiertas: row[13] || "{}",
  };
}

export default async function handler(req, res) {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: "no_autorizado" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = sheetId();

    const [postulacionesRows, perfilesRows, pruebasRows] = await Promise.all([
      readRowsPositional(sheets, spreadsheetId, "Postulaciones - Peluqueria"),
      readRowsPositional(sheets, spreadsheetId, "Perfiles"),
      readRowsPositional(sheets, spreadsheetId, "Pruebas - Peluqueria"),
    ]);

    const postulaciones = postulacionesRows.map(mapInicial);
    const perfilesPeluqueria = perfilesRows.map(mapEstilo).filter((p) => p.cargo === "peluqueria");
    const pruebas = pruebasRows.map(mapTecnica);

    const byName = new Map();
    function bucket(nombre) {
      const key = normalizeName(nombre);
      if (!key) return null;
      if (!byName.has(key)) {
        byName.set(key, { nombre: String(nombre).trim(), inicial: null, estilo: null, tecnica: null });
      }
      return byName.get(key);
    }

    postulaciones.forEach((row) => { const b = bucket(row.nombre); if (b) b.inicial = row; });
    perfilesPeluqueria.forEach((row) => { const b = bucket(row.nombre); if (b) b.estilo = row; });
    pruebas.forEach((row) => { const b = bucket(row.nombre); if (b) b.tecnica = row; });

    // más recientes primero
    const candidatos = [...byName.values()].sort((a, b) => {
      const da = new Date(a.inicial?.fecha || a.estilo?.fecha || a.tecnica?.fecha || 0);
      const db = new Date(b.inicial?.fecha || b.estilo?.fecha || b.tecnica?.fecha || 0);
      return db - da;
    });

    return res.status(200).json({ ok: true, candidatos });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err) });
  }
}
