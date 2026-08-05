import React, { useState, useEffect } from "react";

/* ================== CONFIG ================== */
// Cambia esta clave cuando quieras rotar el acceso del equipo al informe.
const PASSWORD = "PetStation2026";
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

/* ================== DATOS ================== */
const CANDIDATAS = [
  {
    nombre: "Yuri Natalia Cuenca Moreno",
    fechas: { postulo: "29 jul 2026", estilo: "29 jul 2026", tecnica: null },
    experiencia: "11 años", tarjeta: "31554", ubicacion: "Funza",
    finde: "Disponible", inicio: "Inmediatamente", salario: "$3.500.000",
    flag: null,
    dims: [
      { label: "Análisis y método", labelR: "Agilidad y espontaneidad", pct: 33.3, fuerza: "leve", texto: "Análisis y método — leve" },
      { label: "Orden y precisión", labelR: "Flexibilidad y practicidad", pct: 22.2, fuerza: "marcada", texto: "Marcada orden y precisión" },
      { label: "Orientación a las personas", labelR: "Foco en la tarea", pct: 55.5, fuerza: "neutral", texto: "Equilibrio personas / tarea" },
      { label: "Calma y estabilidad", labelR: "Intensidad y reactividad", pct: 55.5, fuerza: "neutral", texto: "Equilibrio bajo presión" },
      { label: "Iniciativa y proactividad", labelR: "Ejecución guiada", pct: 50, fuerza: "neutral", texto: "Equilibrio en el promedio — ver nota" },
    ],
    tecnica: null,
    nota: "Respuesta interna inconsistente en iniciativa: se ubicó muy cerca de \"espero indicaciones\" en un ítem y muy cerca de \"propongo mejoras\" en otro — vale la pena explorarlo en entrevista. Es la candidata con más experiencia del grupo (11 años).",
  },
  {
    nombre: "Sonia Milena Pineda Achury",
    fechas: { postulo: "28 jul 2026", estilo: "30 jul 2026", tecnica: "30 jul 2026" },
    experiencia: "2 años", tarjeta: "53344", ubicacion: "Zipaquirá",
    finde: "Disponible", inicio: "1 de agosto", salario: "$2.600.000",
    flag: null,
    dims: [
      { label: "Análisis y método", labelR: "Agilidad y espontaneidad", pct: 33.3, fuerza: "leve", texto: "Análisis y método — leve" },
      { label: "Orden y precisión", labelR: "Flexibilidad y practicidad", pct: 11.2, fuerza: "marcada", texto: "Marcada orden y precisión" },
      { label: "Orientación a las personas", labelR: "Foco en la tarea", pct: 38.8, fuerza: "leve", texto: "Leve equilibrio hacia personas" },
      { label: "Calma y estabilidad", labelR: "Intensidad y reactividad", pct: 22.2, fuerza: "marcada", texto: "Marcada calma y estabilidad" },
      { label: "Iniciativa y proactividad", labelR: "Ejecución guiada", pct: 27.8, fuerza: "leve", texto: "Iniciativa y proactividad — leve" },
    ],
    tecnica: {
      puntaje: 13, total: 13, tiempo: "35 min de 45", envio: "manual",
      sub: [["Cálculos", "4/4"], ["Farmacología", "5/5"], ["Gestión", "4/4"]],
      casos: [
        { titulo: "Caso Atún · diferenciales", texto: "Leucemia felina, insuficiencia cardiaca. Plan: PCR virales, ecocardiograma, perfil completo, Rx tórax 3 vistas, presión arterial seriada, remisión a cardiología." },
        { titulo: "Caso Dante · hallazgos", texto: "Linfopenia con monocitopenia, hepatopatía con posible pancreatitis, hernia perianal, prostatitis. Plan con ecografía abdominal y manejo del dolor; considera eutanasia compasiva si no hay autonomía en la micción/defecación." },
      ],
    },
    nota: "Puntaje objetivo perfecto y respuestas abiertas correctas, aunque más breves que las de Valeria. Perfil metódico, estable bajo presión y proactivo — consistente con su forma de responder la prueba técnica.",
  },
  {
    nombre: "Maria Camila Melendez Morales",
    fechas: { postulo: "3 ago 2026", estilo: "3 ago 2026", tecnica: "4 ago 2026" },
    experiencia: "2 años", tarjeta: "58668", ubicacion: "Chía",
    finde: "Disponible", inicio: "20 días", salario: "$3.000.000",
    flag: "Revisar antes de avanzar",
    alerta: "La prueba técnica se auto-envió a los 51 minutos (excedió el límite de 45) con las 13 preguntas objetivas, los 2 casos clínicos y las 5 preguntas abiertas en blanco. La evaluación de estilo también se completó en 77 segundos (~5 s por pregunta), el tiempo más bajo del grupo. Antes de avanzar, vale la pena confirmar con ella si tuvo un problema técnico o si no llegó a presentar la prueba en serio.",
    dims: [
      { label: "Análisis y método", labelR: "Agilidad y espontaneidad", pct: 55.5, fuerza: "neutral", texto: "Equilibrio, leve hacia agilidad" },
      { label: "Orden y precisión", labelR: "Flexibilidad y practicidad", pct: 50, fuerza: "neutral", texto: "Equilibrio" },
      { label: "Orientación a las personas", labelR: "Foco en la tarea", pct: 33.3, fuerza: "leve", texto: "Orientación a las personas — leve" },
      { label: "Calma y estabilidad", labelR: "Intensidad y reactividad", pct: 38.8, fuerza: "neutral", texto: "Equilibrio" },
      { label: "Iniciativa y proactividad", labelR: "Ejecución guiada", pct: 38.8, fuerza: "neutral", texto: "Equilibrio" },
    ],
    dimsNota: "Tomar con cautela — evaluación completada en 77 s.",
    tecnica: {
      puntaje: 0, total: 13, tiempo: "51 min (excedió el tiempo)", envio: "auto-enviada",
      sub: [["Cálculos", "0/4"], ["Farmacología", "0/5"], ["Gestión", "0/4"]],
      vacio: true,
    },
    nota: "En el cuestionario inicial su sustento salarial fue el más breve del grupo (\"experiencia laboral, trabajo en equipo, dedicación\"). Combinado con el patrón de tiempos muy cortos, conviene una llamada corta antes de decidir si continúa en el proceso o se le da la oportunidad de repetir la prueba técnica.",
  },
  {
    nombre: "Valeria Quintero",
    fechas: { postulo: "3 ago 2026", estilo: "4 ago 2026", tecnica: "4 ago 2026" },
    experiencia: "8 años", tarjeta: "45465", ubicacion: "Chía",
    finde: "Disponible", inicio: "Inmediato", salario: "$4.000.000",
    flag: null,
    dims: [
      { label: "Análisis y método", labelR: "Agilidad y espontaneidad", pct: 33.3, fuerza: "leve", texto: "Análisis y método — leve" },
      { label: "Orden y precisión", labelR: "Flexibilidad y practicidad", pct: 16.7, fuerza: "marcada", texto: "Marcada orden y precisión" },
      { label: "Orientación a las personas", labelR: "Foco en la tarea", pct: 33.3, fuerza: "leve", texto: "Orientación a las personas — leve" },
      { label: "Calma y estabilidad", labelR: "Intensidad y reactividad", pct: 38.8, fuerza: "neutral", texto: "Equilibrio" },
      { label: "Iniciativa y proactividad", labelR: "Ejecución guiada", pct: 33.3, fuerza: "leve", texto: "Iniciativa y proactividad — leve" },
    ],
    tecnica: {
      puntaje: 13, total: 13, tiempo: "35 min de 45", envio: "manual",
      sub: [["Cálculos", "4/4"], ["Farmacología", "5/5"], ["Gestión", "4/4"]],
      casos: [
        { titulo: "Caso Atún · diferenciales", texto: "Hemoparásitos, hemólisis inmunomediada, FIV/FeLV. Plan detallado: frotis sanguíneo, química sérica completa, ecografía abdominal, PCR hemoparásitos y virales, prueba de Coombs, manejo intrahospitalario con interconsulta a cardiología." },
        { titulo: "Caso Dante · hallazgos", texto: "Trombocitosis, linfopenia con monocitopenia (posible estrés/cortisol), enzimas hepáticas y calcio elevados asociados a la masa perianal. Plan con interconsulta a cardiología, Rx de tórax/tráquea, curva de glicemia, ecografía abdominal, fisioterapia y manejo paliativo." },
      ],
    },
    nota: "Mismo puntaje objetivo que Sonia, pero con el desarrollo más extenso y estructurado del grupo en casos clínicos y preguntas abiertas. Es quien pide el salario más alto ($4.000.000), consistente con sus 8 años de experiencia y el nivel de detalle mostrado.",
  },
];

/* ================== UI ================== */
export default function InformeCandidatas() {
  useFonts();
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => { if (ls("informe-unlocked") === "1") setUnlocked(true); }, []);

  function tryUnlock() {
    if (pw === PASSWORD) { lsSet("informe-unlocked", "1"); setUnlocked(true); setErr(false); }
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
          <h1 style={{ ...serif, fontSize: 26, fontWeight: 500, color: C.navy }}>Informe de candidatas</h1>
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

        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
          <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.14em" }}>Pet Station Vet · Proceso de selección</span>
        </div>
        <h1 style={{ ...serif, fontSize: 36, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>Informe de candidatas finalistas</h1>
        <p className="mt-3 mb-6 text-base" style={{ color: C.sub, maxWidth: 640, lineHeight: 1.6 }}>
          Cruce de las tres pruebas del proceso — cuestionario de postulación, evaluación de estilo de trabajo y prueba técnica — para las candidatas que superaron el primer filtro.
        </p>

        <div className="flex flex-wrap gap-2.5 mb-10">
          <Chip n="14" l="postulaciones recibidas" />
          <Arrow />
          <Chip n="4" l="pasaron el filtro inicial" />
          <Arrow />
          <Chip n="3" l="completaron la prueba técnica" />
        </div>

        <SectionTitle>Vista comparativa</SectionTitle>
        <div className="rounded-2xl overflow-x-auto mb-12" style={{ border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)", background: C.surface }}>
          <table className="w-full text-sm" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ background: C.paper }}>
                {["Candidata", "Experiencia", "Ubicación", "Expectativa salarial", "Fin de semana", "Técnica", "Alertas"].map((h) => (
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: C.faint, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CANDIDATAS.map((c) => (
                <tr key={c.nombre}>
                  <td className="px-4 py-3 font-semibold" style={{ borderBottom: `1px solid ${C.line}` }}>{c.nombre}</td>
                  <td className="px-4 py-3" style={{ ...mono, borderBottom: `1px solid ${C.line}` }}>{c.experiencia}</td>
                  <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{c.ubicacion}</td>
                  <td className="px-4 py-3" style={{ ...mono, borderBottom: `1px solid ${C.line}` }}>{c.salario}</td>
                  <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{c.finde}</td>
                  <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
                    {c.tecnica ? <ScorePill ok={c.tecnica.puntaje === c.tecnica.total}>{c.tecnica.puntaje}/{c.tecnica.total} · {Math.round((c.tecnica.puntaje / c.tecnica.total) * 100)}%</ScorePill> : <ScorePill pending>Pendiente</ScorePill>}
                  </td>
                  <td className="px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{c.flag ? <FlagPill>{c.flag}</FlagPill> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SectionTitle>Fichas individuales</SectionTitle>
        <div className="grid gap-6">
          {CANDIDATAS.map((c) => <CandidateCard key={c.nombre} c={c} />)}
        </div>

        <p className="text-xs mt-10 leading-relaxed" style={{ color: C.faint }}>
          Fuente: respuestas registradas en el proceso de selección (cuestionario de postulación, evaluación de estilo de trabajo y prueba técnica). De las 14 postulaciones recibidas, 10 se descartaron en el filtro inicial por falta de tarjeta profesional vigente o disponibilidad de fines de semana. Documento de uso interno — Pet Station Vet.
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
function Chip({ n, l }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-xl px-3.5 py-2" style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 4px 16px rgba(20,33,61,0.04)" }}>
      <span style={{ ...mono, fontWeight: 700, fontSize: 15, color: C.navy }}>{n}</span>
      <span className="text-xs" style={{ color: C.sub }}>{l}</span>
    </div>
  );
}
function Arrow() { return <span className="self-center text-sm" style={{ color: C.faint }}>→</span>; }
function ScorePill({ children, ok, pending }) {
  const style = pending
    ? { background: C.paper, color: C.faint, border: `1px dashed ${C.line}` }
    : ok ? { background: C.goodBg, color: C.good } : { background: C.badBg, color: C.bad };
  return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ ...mono, ...style }}>{children}</span>;
}
function FlagPill({ children }) {
  return <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: C.warnBg, color: C.warn }}>{children}</span>;
}

function DimBar({ d }) {
  const dotStyle = d.fuerza === "marcada"
    ? { background: C.blue, borderColor: C.surface }
    : d.fuerza === "leve"
    ? { background: C.surface, borderColor: C.blue, borderWidth: 2 }
    : { background: C.faint, borderColor: C.surface };
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5" style={{ color: C.faint }}>
        <span>{d.label}</span><span>{d.labelR}</span>
      </div>
      <div className="relative rounded-full" style={{ height: 7, background: C.line }}>
        <div className="absolute" style={{ left: "50%", top: -3, width: 1, height: 13, background: "#C7D0E3" }} />
        <div className="absolute rounded-full" style={{ left: `${d.pct}%`, top: "50%", width: 14, height: 14, transform: "translate(-50%,-50%)", border: "2px solid", boxShadow: `0 0 0 1px ${C.line}`, ...dotStyle }} />
      </div>
      <p className="text-xs mt-1.5" style={{ color: C.sub }}>{d.texto}</p>
    </div>
  );
}

function CandidateCard({ c }) {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-6" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div>
          <h3 style={{ ...serif, fontSize: 22, fontWeight: 500, color: C.navy }}>{c.nombre}</h3>
          <p className="text-xs mt-1" style={{ color: C.sub }}>
            Postuló {c.fechas.postulo} · Estilo {c.fechas.estilo} · Técnica {c.fechas.tecnica || "no presentada"}
          </p>
        </div>
        {c.flag ? <FlagPill>{c.flag}</FlagPill> : <ScorePill ok>Sin alertas</ScorePill>}
      </div>

      <div className="p-6 grid gap-6">
        <div className="grid gap-4 rounded-2xl p-4" style={{ background: C.paper, border: `1px solid ${C.line}`, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <Fact k="Experiencia" v={c.experiencia} />
          <Fact k="Tarjeta profesional" v={c.tarjeta} mono />
          <Fact k="Ubicación" v={c.ubicacion} />
          <Fact k="Fin de semana" v={c.finde} />
          <Fact k="Puede iniciar" v={c.inicio} />
          <Fact k="Expectativa salarial" v={c.salario} mono />
        </div>

        {c.alerta && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: C.badBg, color: C.bad, lineHeight: 1.55 }}>
            ⚠ {c.alerta}
          </div>
        )}

        <div className="grid gap-6" style={{ gridTemplateColumns: "1.15fr 0.85fr" }}>
          <div>
            <p className="text-xs font-bold uppercase mb-3" style={{ color: C.faint, letterSpacing: "0.07em" }}>
              Perfil de estilo de trabajo {c.dimsNota && <span className="font-normal normal-case" style={{ color: C.faint }}>({c.dimsNota})</span>}
            </p>
            {c.dims.map((d, i) => <DimBar key={i} d={d} />)}
          </div>

          <div>
            <p className="text-xs font-bold uppercase mb-3" style={{ color: C.faint, letterSpacing: "0.07em" }}>Prueba técnica</p>
            {!c.tecnica ? (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: C.paper, border: `1px dashed ${C.line}`, color: C.faint }}>
                Esta candidata todavía no aparece en los registros de la prueba técnica.
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span style={{ ...mono, fontSize: 30, fontWeight: 700, color: c.tecnica.puntaje === c.tecnica.total ? C.good : C.bad }}>{c.tecnica.puntaje}/{c.tecnica.total}</span>
                  <span className="text-xs" style={{ color: C.faint }}>{Math.round((c.tecnica.puntaje / c.tecnica.total) * 100)}% · {c.tecnica.tiempo} · {c.tecnica.envio}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {c.tecnica.sub.map(([label, val]) => (
                    <div key={label} className="text-center rounded-lg px-2 py-2" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                      <div className="text-[10px] uppercase" style={{ color: C.faint }}>{label}</div>
                      <div style={{ ...mono, fontWeight: 700, fontSize: 14 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {c.tecnica.vacio ? (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: C.paper, border: `1px dashed ${C.line}`, color: C.faint }}>
                    Casos clínicos y preguntas abiertas: sin respuesta.
                  </div>
                ) : c.tecnica.casos.map((q, i) => (
                  <div key={i} className="pl-3 mb-3 last:mb-0" style={{ borderLeft: `3px solid ${C.line}` }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: C.faint }}>{q.titulo}</div>
                    <p className="text-sm" style={{ color: C.ink, lineHeight: 1.5 }}>{q.texto}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="rounded-r-xl px-4 py-3 text-sm" style={{ background: C.paper, borderLeft: `3px solid ${C.blue}`, color: C.sub, lineHeight: 1.55 }}>
          <b style={{ color: C.ink }}>Nota:</b> {c.nota}
        </div>
      </div>
    </div>
  );
}

function Fact({ k, v, mono: isMono }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-bold" style={{ color: C.faint, letterSpacing: "0.06em" }}>{k}</div>
      <div className="text-sm font-semibold mt-0.5" style={isMono ? mono : {}}>{v}</div>
    </div>
  );
}
