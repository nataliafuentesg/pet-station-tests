import { getSheetsClient, sheetId, readSheetAsObjects } from "./_lib/sheets.js";

// Misma clave que usa el front (src/InformePeluqueria.jsx) para el acceso del equipo.
// Cambia este valor si quieres rotar el acceso — no depende de ninguna cuenta real.
const ADMIN_KEY = "PetStationPeluqueria2026";

function normalizeName(n) {
  return String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default async function handler(req, res) {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: "no_autorizado" });
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = sheetId();

    const [postulaciones, perfiles, pruebas] = await Promise.all([
      readSheetAsObjects(sheets, spreadsheetId, "Postulaciones - Peluqueria"),
      readSheetAsObjects(sheets, spreadsheetId, "Perfiles"),
      readSheetAsObjects(sheets, spreadsheetId, "Pruebas - Peluqueria"),
    ]);

    const perfilesPeluqueria = perfiles.filter(
      (p) => String(p["Cargo"] || "").toLowerCase() === "peluqueria"
    );

    const byName = new Map();
    function bucket(nombre) {
      const key = normalizeName(nombre);
      if (!key) return null;
      if (!byName.has(key)) {
        byName.set(key, { nombre: String(nombre).trim(), inicial: null, estilo: null, tecnica: null });
      }
      return byName.get(key);
    }

    postulaciones.forEach((row) => { const b = bucket(row["Nombre"]); if (b) b.inicial = row; });
    perfilesPeluqueria.forEach((row) => { const b = bucket(row["Nombre"]); if (b) b.estilo = row; });
    pruebas.forEach((row) => { const b = bucket(row["Nombre"]); if (b) b.tecnica = row; });

    // más recientes primero, según la fecha del cuestionario inicial (o de lo que exista)
    const candidatos = [...byName.values()].sort((a, b) => {
      const da = new Date(a.inicial?.Fecha || a.estilo?.Fecha || a.tecnica?.Fecha || 0);
      const db = new Date(b.inicial?.Fecha || b.estilo?.Fecha || b.tecnica?.Fecha || 0);
      return db - da;
    });

    return res.status(200).json({ ok: true, candidatos });
  } catch (err) {
    return res.status(200).json({ ok: false, error: String(err) });
  }
}
