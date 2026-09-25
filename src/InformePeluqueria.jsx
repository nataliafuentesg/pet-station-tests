import React, { useState, useEffect } from "react";

/* ================== CONFIG ================== */
// Misma clave que api/candidatos-peluqueria.js. Cambia ambas si quieres rotar el acceso.
const PASSWORD = "PetStationPeluqueria2026";
/* ============================================ */

const C = {
  paper: "#F4F6FB", surface: "#FFFFFF", ink: "#14213D", sub: "#586182",
  faint: "#9AA6BE", navy: "#152C77", blue: "#2563EB", blueDk: "#1E3A8A",
  soft: "#E7EEFB", line: "#E2E7F1",
  good: "#1E7F5C", goodBg: "#E4F3EC",
  bad: "#B23B3B", badBg: "#FBEAEA",
  warn: "#B5591E", warnBg: "#FBEDE1",
};
const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };
const mono = { fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontVariantNumeric: "tabular-nums" };

const ls = (k) => { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { window.sessionStorage.setItem(k, v); } catch (e) {} };

function useFonts() {
  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(l); return () => document.head.removeChild(l);
  }, []);
}

/* ---------- textos de las preguntas (para mostrar junto a las respuestas) ---------- */
const HERRAMIENTAS_LABELS = {
  A1: "Zonas de mayor riesgo de corte y herramienta usada",
  A2: "Herramientas por corte (Poodle, Shih Tzu, Golden Retriever)",
  A3: "Herramienta y técnica para desenredar manto largo vs. una capa",
};
const CASES_LABELS = {
  CASE_SIMONA: "Caso: Simona (Golden Retriever enredada)",
  CASE_MICHI: "Caso: Michi (Gato Persa estresado)",
};
const OPEN_LABELS = {
  E1: "Cliente inconforme con el corte",
  E2: "Parásitos visibles al recibir la mascota",
  E3: "Control de insumos y estado de máquinas/tijeras",
  E4: "Imprevisto personal grave en plena jornada",
  E5: "Señales de estrés extremo y cómo terminar el trabajo con seguridad",
};

function parseJSONSafe(s) { try { return JSON.parse(s || "{}"); } catch (e) { return {}; } }
function countScore(obj) { const vals = Object.values(obj); const ok = vals.filter((v) => v === true).length; return { ok, total: vals.length }; }
function mmss(totalSec) { const s = Number(totalSec) || 0; const m = Math.floor(s / 60), r = Math.round(s % 60); return `${m} min${r ? ` ${r}s` : ""}`; }
function fmtDate(iso) { if (!iso) return ""; try { return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } }

export default function InformePeluqueria() {
  useFonts();
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [state, setState] = useState({ status: "idle", candidatos: [], error: "" });

  useEffect(() => { if (ls("informe-peluqueria-unlocked") === "1") setUnlocked(true); }, []);
  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  async function load() {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const r = await fetch(`/api/candidatos-peluqueria?key=${encodeURIComponent(PASSWORD)}`);
      const data = await r.json();
      if (!data.ok) { setState({ status: "error", candidatos: [], error: data.error || "Error desconocido" }); return; }
      setState({ status: "ready", candidatos: data.candidatos, error: "" });
    } catch (e) {
      setState({ status: "error", candidatos: [], error: String(e) });
    }
  }

  function tryUnlock() {
    if (pw === PASSWORD) { lsSet("informe-peluqueria-unlocked", "1"); setUnlocked(true); setErr(false); }
    else setErr(true);
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
        <div className="w-full rounded-3xl p-8" style={{ maxWidth: 420, background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
            <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.14em" }}>Acceso interno</span>
          </div>
          <h1 style={{ ...serif, fontSize: 26, fontWeight: 500, color: C.navy }}>Candidatos — Peluquería</h1>
          <p className="mt-2 mb-5 text-sm" style={{ color: C.sub }}>Ingresa la clave del equipo para ver el informe.</p>
          <input
            type="password" value={pw} autoFocus
            onChange={(e) => { setPw(e.target.value); setErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            placeholder="Clave"
            className="w-full rounded-xl px-4 py-2.5 outline-none mb-2"
            style={{ border: `1px solid ${err ? C.bad : C.line}` }}
          />
          {err && <p className="text-xs mb-3" style={{ color: C.bad }}>Clave incorrecta.</p>}
          <button onClick={tryUnlock} className="w-full rounded-xl py-3 font-medium cursor-pointer" style={{ background: C.blue, color: "#fff", fontSize: 15 }}>Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full py-12 px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
      <div className="mx-auto" style={{ maxWidth: 880 }}>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
            <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.14em" }}>Pet Station Vet · Proceso de selección</span>
          </div>
          <button onClick={load} className="text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer" style={{ background: C.soft, color: C.blueDk, border: `1px solid ${C.line}` }}>
            {state.status === "loading" ? "Actualizando…" : "↻ Actualizar"}
          </button>
        </div>

        <h1 style={{ ...serif, fontSize: 34, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>Candidatos — Peluquero(a) Canino/Felino</h1>
        <p className="mt-3 mb-8 text-base" style={{ color: C.sub, maxWidth: 640, lineHeight: 1.6 }}>
          Este informe se alimenta directo del Sheet: en cuanto alguien completa el cuestionario inicial, el test de estilo o la prueba técnica, aparece o se actualiza aquí — solo dale a "Actualizar".
        </p>

        {state.status === "loading" && state.candidatos.length === 0 && (
          <Center>Cargando candidatos…</Center>
        )}

        {state.status === "error" && (
          <div className="rounded-2xl px-5 py-4 mb-6" style={{ background: C.badBg, border: `1px solid ${C.bad}`, color: C.bad, fontSize: 14 }}>
            No pude cargar los datos: {state.error}
          </div>
        )}

        {state.status === "ready" && state.candidatos.length === 0 && (
          <Center>Todavía no hay candidatos registrados para este cargo.</Center>
        )}

        {state.candidatos.length > 0 && (
          <>
            <SectionTitle>Vista comparativa</SectionTitle>
            <div className="rounded-2xl overflow-x-auto mb-12" style={{ border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)", background: C.surface }}>
              <table className="w-full text-sm" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ background: C.paper }}>
                    {["Candidato", "Experiencia", "Ubicación", "Expectativa salarial", "Lun-sáb", "Técnica", "Alertas"].map((h) => (
                      <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: C.faint, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.candidatos.map((c) => {
                    const tec = c.tecnica;
                    const puntaje = tec ? Number(tec.puntaje) : null;
                    const total = tec ? Number(tec.total) : null;
                    const banderas = c.inicial?.banderas || "";
                    return (
                      <tr key={c.nombre}>
                        <td className="px-4 py-3 font-semibold" style={{ borderBottom: `1px solid ${C.line}` }}>{c.nombre}</td>
                        <td className="px-4 py-3" style={{ ...mono, borderBottom: `1px solid ${C.line}` }}>{c.inicial?.aniosExp || "—"}</td>
                        <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{c.inicial?.ubicacion || "—"}</td>
                        <td className="px-4 py-3" style={{ ...mono, borderBottom: `1px solid ${C.line}` }}>{c.inicial?.salario || "—"}</td>
                        <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{c.inicial?.comodoLunesSabado || "—"}</td>
                        <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                          {tec ? <ScorePill ok={puntaje === total}>{puntaje}/{total} · {tec.pct}%</ScorePill> : <ScorePill pending>Pendiente</ScorePill>}
                        </td>
                        <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{banderas && banderas !== "OK" ? <FlagPill>{banderas}</FlagPill> : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <SectionTitle>Fichas individuales</SectionTitle>
            <div className="grid gap-6">
              {state.candidatos.map((c) => <CandidateCard key={c.nombre} c={c} />)}
            </div>
          </>
        )}

        <p className="text-xs mt-10 leading-relaxed" style={{ color: C.faint }}>
          Datos leídos en vivo de las hojas "Postulaciones - Peluqueria", "Perfiles" (filtrado por cargo) y "Pruebas - Peluqueria". Documento de uso interno — Pet Station Vet.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-bold uppercase" style={{ color: C.faint, letterSpacing: "0.1em" }}>{children}</h2>
      <div className="flex-1 h-px" style={{ background: C.line }} />
    </div>
  );
}
function Center({ children }) {
  return <div className="rounded-3xl p-10 text-center mb-8" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.sub }}>{children}</div>;
}
function ScorePill({ children, ok, pending }) {
  const style = pending
    ? { background: C.paper, color: C.faint, border: `1px dashed ${C.line}` }
    : ok ? { background: C.goodBg, color: C.good } : { background: C.badBg, color: C.bad };
  return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ ...mono, ...style }}>{children}</span>;
}
function FlagPill({ children }) {
  return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: C.warnBg, color: C.warn }}>{children}</span>;
}

function DimBar({ label, labelR, media, tendencia }) {
  const m = parseFloat(String(media).replace(",", "."));
  const hasMedia = !isNaN(m);
  const pct = hasMedia ? Math.max(0, Math.min(100, ((m - 1) / 6) * 100)) : 50;
  const d = hasMedia ? m - 4 : 0;
  const fuerza = Math.abs(d) >= 1.6 ? "marcada" : Math.abs(d) < 0.7 ? "neutral" : "leve";
  const dotStyle = fuerza === "marcada"
    ? { background: C.blue, borderColor: C.surface }
    : fuerza === "leve"
    ? { background: C.surface, borderColor: C.blue, borderWidth: 2 }
    : { background: C.faint, borderColor: C.surface };
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5" style={{ color: C.faint }}>
        <span>{label}</span><span>{labelR}</span>
      </div>
      <div className="relative rounded-full" style={{ height: 7, background: C.line }}>
        <div className="absolute" style={{ left: "50%", top: -3, width: 1, height: 13, background: "#C7D0E3" }} />
        {hasMedia && <div className="absolute rounded-full" style={{ left: `${pct}%`, top: "50%", width: 14, height: 14, transform: "translate(-50%,-50%)", border: "2px solid", boxShadow: `0 0 0 1px ${C.line}`, ...dotStyle }} />}
      </div>
      <p className="text-xs mt-1.5" style={{ color: C.sub }}>{tendencia || "Sin datos"}</p>
    </div>
  );
}

const DIMENSIONES = [
  { key: "cognitivo", label: "Análisis y método", labelR: "Agilidad y espontaneidad" },
  { key: "orden", label: "Orden y precisión", labelR: "Flexibilidad y practicidad" },
  { key: "personas", label: "Orientación a las personas", labelR: "Foco en la tarea" },
  { key: "presion", label: "Calma y estabilidad", labelR: "Intensidad y reactividad" },
  { key: "iniciativa", label: "Iniciativa y proactividad", labelR: "Ejecución guiada" },
];

function CandidateCard({ c }) {
  const banderas = c.inicial?.banderas || "";
  const hasFlag = banderas && banderas !== "OK";
  const tec = c.tecnica;
  const higiene = tec ? countScore(parseJSONSafe(tec.detalleHigiene)) : null;
  const comportamiento = tec ? countScore(parseJSONSafe(tec.detalleComportamiento)) : null;
  const casos = tec ? parseJSONSafe(tec.casos) : {};
  const abiertas = tec ? parseJSONSafe(tec.abiertas) : {};
  const herramientas = ["A1", "A2", "A3"].filter((id) => abiertas[id]);

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-6" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div>
          <h3 style={{ ...serif, fontSize: 22, fontWeight: 500, color: C.navy }}>{c.nombre}</h3>
          <p className="text-xs mt-1" style={{ color: C.sub }}>
            Postuló {fmtDate(c.inicial?.fecha) || "—"} · Estilo {fmtDate(c.estilo?.fecha) || "no presentada"} · Técnica {fmtDate(c.tecnica?.fecha) || "no presentada"}
          </p>
        </div>
        {hasFlag ? <FlagPill>{banderas}</FlagPill> : <ScorePill ok>Sin alertas</ScorePill>}
      </div>

      <div className="p-6 grid gap-6">
        {c.inicial ? (
          <div className="grid gap-4 rounded-2xl p-4" style={{ background: C.paper, border: `1px solid ${C.line}`, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <Fact k="Experiencia previa" v={c.inicial.experienciaPrevia} />
            <Fact k="Años de experiencia" v={c.inicial.aniosExp} />
            <Fact k="Certificaciones" v={c.inicial.certificaciones || "—"} />
            <Fact k="Lunes a sábado" v={c.inicial.comodoLunesSabado} />
            <Fact k="Ubicación" v={c.inicial.ubicacion} />
            <Fact k="Puede empezar" v={c.inicial.puedeEmpezar} />
            <Fact k="Expectativa salarial" v={c.inicial.salario} mono />
            <Fact k="Cómodo con" v={c.inicial.comodoCon || "—"} />
          </div>
        ) : (
          <Pending>Todavía no ha llenado el cuestionario inicial.</Pending>
        )}

        <div className="grid gap-6" style={{ gridTemplateColumns: "1.15fr 0.85fr" }}>
          <div>
            <p className="text-xs font-bold uppercase mb-3" style={{ color: C.faint, letterSpacing: "0.07em" }}>Perfil de estilo de trabajo</p>
            {c.estilo ? DIMENSIONES.map((d) => (
              <DimBar key={d.key} label={d.label} labelR={d.labelR} media={c.estilo[d.key]?.media} tendencia={c.estilo[d.key]?.tendencia} />
            )) : <Pending>Todavía no ha presentado la evaluación de estilo.</Pending>}
          </div>

          <div>
            <p className="text-xs font-bold uppercase mb-3" style={{ color: C.faint, letterSpacing: "0.07em" }}>Prueba técnica</p>
            {!tec ? <Pending>Todavía no ha presentado la prueba técnica.</Pending> : (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span style={{ ...mono, fontSize: 30, fontWeight: 700, color: Number(tec.puntaje) === Number(tec.total) ? C.good : C.bad }}>{tec.puntaje}/{tec.total}</span>
                  <span className="text-xs" style={{ color: C.faint }}>{tec.pct}% · {mmss(tec.tiempoSeg)} · {tec.autoenviado === "Sí" ? "auto-enviada" : "manual"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center rounded-lg px-2 py-2" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                    <div className="text-[10px] uppercase" style={{ color: C.faint }}>Higiene</div>
                    <div style={{ ...mono, fontWeight: 700, fontSize: 14 }}>{higiene.ok}/{higiene.total}</div>
                  </div>
                  <div className="text-center rounded-lg px-2 py-2" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                    <div className="text-[10px] uppercase" style={{ color: C.faint }}>Comportamiento</div>
                    <div style={{ ...mono, fontWeight: 700, fontSize: 14 }}>{comportamiento.ok}/{comportamiento.total}</div>
                  </div>
                </div>

                {herramientas.map((id) => (
                  <div key={id} className="pl-3 mb-3" style={{ borderLeft: `3px solid ${C.line}` }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: C.faint }}>{id} · {HERRAMIENTAS_LABELS[id]}</div>
                    <p className="text-sm" style={{ color: C.ink, lineHeight: 1.5, whiteSpace: "pre-line" }}>{abiertas[id]}</p>
                  </div>
                ))}

                {Object.keys(casos).filter((id) => casos[id]).map((id) => (
                  <div key={id} className="pl-3 mb-3" style={{ borderLeft: `3px solid ${C.line}` }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: C.faint }}>{CASES_LABELS[id] || id}</div>
                    <p className="text-sm" style={{ color: C.ink, lineHeight: 1.5 }}>{casos[id]}</p>
                  </div>
                ))}

                {Object.keys(OPEN_LABELS).filter((id) => abiertas[id]).map((id) => (
                  <div key={id} className="pl-3 mb-3 last:mb-0" style={{ borderLeft: `3px solid ${C.line}` }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: C.faint }}>{id} · {OPEN_LABELS[id]}</div>
                    <p className="text-sm" style={{ color: C.ink, lineHeight: 1.5 }}>{abiertas[id]}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Pending({ children }) {
  return <div className="rounded-xl px-4 py-3 text-sm" style={{ background: C.paper, border: `1px dashed ${C.line}`, color: C.faint }}>{children}</div>;
}
function Fact({ k, v, mono: isMono }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-bold" style={{ color: C.faint, letterSpacing: "0.06em" }}>{k}</div>
      <div className="text-sm font-semibold mt-0.5" style={isMono ? mono : {}}>{v || "—"}</div>
    </div>
  );
}
