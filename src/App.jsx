import React, { useState, useEffect, useMemo } from "react";

/**
 * Evaluación de estilo de trabajo — autoevaluación de rasgos de comportamiento.
 * Descriptiva (no aprobado/reprobado). Devuelve un perfil de tendencias.
 *
 * Para guardar en Google Sheets: despliega el Apps Script (Code.gs) como Web App
 * y pega la URL en WEBAPP_URL. En este preview el envío no funciona (sandbox),
 * pero el botón "Copiar resultados" siempre entrega el JSON.
 */
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwtDmt31qfJITUxgBriD4QwxJ9vcDN7GL0MvqglRcZIGYUwraLgsNUMxRfYhzzO8ua9/exec"; // <-- pega aquí la URL del Web App de Apps Script

const COLORS = {
  paper: "#F5F2EC",
  surface: "#FFFFFF",
  ink: "#1E2E33",
  sub: "#5C6B70",
  faint: "#98A6AA",
  teal: "#2C7A76",
  tealSoft: "#DCEBE8",
  amber: "#E0A458",
  line: "#E6E1D7",
};

const SECTIONS = [
  {
    id: "cognitivo", title: "Cómo piensas y decides",
    left: "Análisis y método", right: "Agilidad y espontaneidad",
    items: [
      { left: "Analítico(a)", right: "Rápido(a)" },
      { left: "Metódico(a)", right: "Espontáneo(a)" },
      { left: "Deliberado(a)", right: "Impulsivo(a)" },
    ],
  },
  {
    id: "orden", title: "Orden y ejecución",
    left: "Orden y precisión", right: "Flexibilidad y practicidad",
    items: [
      { left: "Organizado(a)", right: "Flexible" },
      { left: "Preciso(a)", right: "Práctico(a)" },
      { left: "Sigo procesos", right: "Improviso" },
    ],
  },
  {
    id: "personas", title: "Relación con los demás",
    left: "Orientación a las personas", right: "Foco en la tarea",
    items: [
      { left: "Orientado(a) al cliente", right: "Orientado(a) a la tarea" },
      { left: "Empático(a)", right: "Objetivo(a)" },
      { left: "Colaborador(a)", right: "Autónomo(a)" },
    ],
  },
  {
    id: "presion", title: "Bajo presión",
    left: "Calma y estabilidad", right: "Intensidad y reactividad",
    items: [
      { left: "Tranquilo(a) bajo presión", right: "Me acelero" },
      { left: "Constante", right: "Cambiante" },
      { left: "Resiliente al estrés", right: "Sensible al estrés" },
    ],
  },
  {
    id: "iniciativa", title: "Iniciativa",
    left: "Iniciativa y proactividad", right: "Ejecución guiada",
    items: [
      { left: "Proactivo(a)", right: "Espero indicaciones" },
      { left: "Propongo mejoras", right: "Sigo lo establecido" },
      { left: "Decido con autonomía", right: "Consulto primero" },
    ],
  },
];

const TOTAL_ITEMS = SECTIONS.reduce((n, s) => n + s.items.length, 0);

function useFonts() {
  useEffect(() => {
    const l1 = document.createElement("link");
    l1.rel = "stylesheet";
    l1.href = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(l1);
    return () => { document.head.removeChild(l1); };
  }, []);
}

const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

function leaning(mean, sec) {
  const d = mean - 4;
  if (Math.abs(d) < 0.7) return { side: "bal", label: `equilibrio entre ${sec.left.toLowerCase()} y ${sec.right.toLowerCase()}` };
  const strong = Math.abs(d) >= 1.6;
  if (d < 0) return { side: "left", label: (strong ? "marcada " : "") + sec.left.toLowerCase() };
  return { side: "right", label: (strong ? "marcada " : "") + sec.right.toLowerCase() };
}

function Dot({ active, onClick, tone }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full transition-all duration-150"
      style={{
        width: active ? 22 : 14, height: active ? 22 : 14,
        background: active ? tone : "#FFFFFF",
        border: `2px solid ${active ? tone : COLORS.faint}`,
        boxShadow: active ? `0 2px 8px ${tone}55` : "none",
        cursor: "pointer",
      }}
      aria-label="opción"
    />
  );
}

function Scale({ value, onChange }) {
  return (
    <div className="flex items-center justify-between w-full" style={{ maxWidth: 260 }}>
      {[1, 2, 3, 4, 5, 6, 7].map((n) => {
        const tone = n === 4 ? COLORS.amber : COLORS.teal;
        return <Dot key={n} active={value === n} tone={tone} onClick={() => onChange(n)} />;
      })}
    </div>
  );
}

export default function App() {
  useFonts();
  const [step, setStep] = useState("intro"); // intro | quiz | results
  const [sectionIdx, setSectionIdx] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState({}); // key `${secId}-${i}` -> 1..7
  const [sent, setSent] = useState("idle"); // idle | sending | ok | err
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const answeredCount = Object.keys(answers).length;

  const results = useMemo(() => {
    return SECTIONS.map((sec) => {
      const vals = sec.items.map((_, i) => answers[`${sec.id}-${i}`]).filter(Boolean);
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 4;
      return { id: sec.id, title: sec.title, sec, mean, lean: leaning(mean, sec) };
    });
  }, [answers]);

  const summary = useMemo(() => {
    const leaned = results.filter((r) => r.lean.side !== "bal").map((r) => r.lean.label);
    const bal = results.filter((r) => r.lean.side === "bal");
    let s = "";
    if (leaned.length) s += "Tu perfil se inclina hacia " + leaned.join(", ") + ".";
    if (bal.length) s += (s ? " " : "") + "Muestras equilibrio en " + bal.map((b) => b.title.toLowerCase()).join(" y ") + ".";
    return s || "Perfil equilibrado en las cinco dimensiones.";
  }, [results]);

  const payload = useMemo(() => ({
    fecha: new Date().toISOString(),
    nombre: name, email,
    dimensiones: results.reduce((o, r) => { o[r.id] = { media: Number(r.mean.toFixed(2)), tendencia: r.lean.label }; return o; }, {}),
    resumen: summary,
    respuestas: answers,
  }), [name, email, results, summary, answers]);

  const section = SECTIONS[sectionIdx];
  const sectionComplete = section?.items.every((_, i) => answers[`${section.id}-${i}`]);

  function setAns(secId, i, v) { setAnswers((a) => ({ ...a, [`${secId}-${i}`]: v })); }

  async function submit() {
    if (!WEBAPP_URL) { setSent("err"); return; }
    setSent("sending");
    try {
      await fetch(WEBAPP_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      setSent("ok");
    } catch (e) { setSent("err"); }
  }

  function copyJson() {
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="min-h-screen w-full flex items-start justify-center py-10 px-4" style={{ background: COLORS.paper, ...sans, color: COLORS.ink }}>
      <div className="w-full" style={{ maxWidth: 620 }}>

        {/* header mark */}
        <div className="flex items-center gap-2 mb-6">
          <div className="rounded-full" style={{ width: 10, height: 10, background: COLORS.teal }} />
          <span className="text-xs tracking-widest uppercase" style={{ color: COLORS.faint, letterSpacing: "0.18em" }}>
            Evaluación de estilo de trabajo
          </span>
        </div>

        {step === "intro" && (
          <div className="rounded-3xl p-8" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, boxShadow: "0 10px 40px rgba(30,46,51,0.06)" }}>
            <h1 style={{ ...serif, fontSize: 40, lineHeight: 1.1, fontWeight: 500 }}>
              ¿Cómo trabajas<br />cuando estás en tu elemento?
            </h1>
            <p className="mt-4" style={{ color: COLORS.sub, fontSize: 16, lineHeight: 1.6 }}>
              Son 15 preguntas rápidas. No hay respuestas correctas ni incorrectas: te ubicas entre dos formas de ser, según cómo te describirías normalmente en el trabajo. Al final verás tu perfil de tendencias.
            </p>
            <div className="mt-7 grid gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre"
                className="w-full rounded-xl px-4 py-3 outline-none" style={{ border: `1px solid ${COLORS.line}`, ...sans }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo"
                className="w-full rounded-xl px-4 py-3 outline-none" style={{ border: `1px solid ${COLORS.line}`, ...sans }} />
            </div>
            <button onClick={() => setStep("quiz")}
              className="mt-6 w-full rounded-xl py-3.5 font-medium transition-opacity"
              style={{ background: COLORS.teal, color: "#fff", fontSize: 16 }}>
              Comenzar
            </button>
            <p className="mt-4 text-xs" style={{ color: COLORS.faint }}>
              Este cuestionario describe tu estilo de trabajo. No evalúa tu salud ni tiene puntaje de aprobación.
            </p>
          </div>
        )}

        {step === "quiz" && (
          <div>
            {/* progress */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: COLORS.sub }}>Sección {sectionIdx + 1} de {SECTIONS.length}</span>
                <span className="text-sm" style={{ color: COLORS.faint }}>{answeredCount}/{TOTAL_ITEMS}</span>
              </div>
              <div className="w-full rounded-full" style={{ height: 6, background: COLORS.line }}>
                <div className="rounded-full transition-all duration-300" style={{ height: 6, width: `${(answeredCount / TOTAL_ITEMS) * 100}%`, background: COLORS.teal }} />
              </div>
            </div>

            <div className="rounded-3xl p-7" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, boxShadow: "0 10px 40px rgba(30,46,51,0.06)" }}>
              <h2 style={{ ...serif, fontSize: 26, fontWeight: 500 }}>{section.title}</h2>
              <p className="mt-1 mb-6 text-sm" style={{ color: COLORS.faint }}>Elige el punto que más te representa.</p>

              <div className="grid gap-7">
                {section.items.map((it, i) => {
                  const v = answers[`${section.id}-${i}`];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-right" style={{ color: v && v < 4 ? COLORS.ink : COLORS.sub, width: 96, fontWeight: v && v < 4 ? 600 : 400 }}>{it.left}</span>
                        <Scale value={v} onChange={(n) => setAns(section.id, i, n)} />
                        <span className="text-sm" style={{ color: v && v > 4 ? COLORS.ink : COLORS.sub, width: 96, fontWeight: v && v > 4 ? 600 : 400 }}>{it.right}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mt-5">
              <button onClick={() => sectionIdx === 0 ? setStep("intro") : setSectionIdx((x) => x - 1)}
                className="rounded-xl px-5 py-2.5 text-sm font-medium" style={{ color: COLORS.sub, border: `1px solid ${COLORS.line}`, background: "#fff" }}>
                Atrás
              </button>
              {sectionIdx < SECTIONS.length - 1 ? (
                <button disabled={!sectionComplete} onClick={() => setSectionIdx((x) => x + 1)}
                  className="rounded-xl px-6 py-2.5 text-sm font-medium transition-opacity"
                  style={{ background: sectionComplete ? COLORS.teal : COLORS.line, color: sectionComplete ? "#fff" : COLORS.faint, cursor: sectionComplete ? "pointer" : "not-allowed" }}>
                  Siguiente
                </button>
              ) : (
                <button disabled={answeredCount < TOTAL_ITEMS} onClick={() => setStep("results")}
                  className="rounded-xl px-6 py-2.5 text-sm font-medium transition-opacity"
                  style={{ background: answeredCount >= TOTAL_ITEMS ? COLORS.teal : COLORS.line, color: answeredCount >= TOTAL_ITEMS ? "#fff" : COLORS.faint, cursor: answeredCount >= TOTAL_ITEMS ? "pointer" : "not-allowed" }}>
                  Ver mi perfil
                </button>
              )}
            </div>
          </div>
        )}

        {step === "results" && (
          <div className="grid gap-5">
            <div className="rounded-3xl p-8" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, boxShadow: "0 10px 40px rgba(30,46,51,0.06)" }}>
              <span className="text-xs tracking-widest uppercase" style={{ color: COLORS.faint, letterSpacing: "0.16em" }}>Perfil de estilo de trabajo</span>
              <h1 className="mt-1" style={{ ...serif, fontSize: 34, fontWeight: 500 }}>{name || "Tu perfil"}</h1>
              <p className="mt-3" style={{ ...serif, fontSize: 19, lineHeight: 1.55, color: COLORS.ink, fontStyle: "italic" }}>
                {summary}
              </p>
            </div>

            <div className="rounded-3xl p-7" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, boxShadow: "0 10px 40px rgba(30,46,51,0.06)" }}>
              <h2 className="mb-5" style={{ ...serif, fontSize: 22, fontWeight: 500 }}>Dónde te ubicas</h2>
              <div className="grid gap-6">
                {results.map((r) => {
                  const pct = ((r.mean - 1) / 6) * 100;
                  return (
                    <div key={r.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs" style={{ color: COLORS.sub, width: 130 }}>{r.sec.left}</span>
                        <span className="text-xs text-right" style={{ color: COLORS.sub, width: 130 }}>{r.sec.right}</span>
                      </div>
                      <div className="relative w-full rounded-full" style={{ height: 8, background: COLORS.tealSoft }}>
                        <div className="absolute rounded-full transition-all duration-500" style={{
                          top: -4, height: 16, width: 16, left: `${pct}%`, transform: "translateX(-50%)",
                          background: COLORS.teal, border: "3px solid #fff", boxShadow: `0 2px 8px ${COLORS.teal}55`,
                        }} />
                      </div>
                      <div className="mt-2 text-xs" style={{ color: COLORS.faint }}>{r.title} · <span style={{ color: COLORS.teal }}>{r.lean.label}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl p-6" style={{ background: COLORS.tealSoft, border: `1px solid ${COLORS.line}` }}>
              <p className="text-sm" style={{ color: COLORS.ink, lineHeight: 1.6 }}>
                <strong>Cómo se lee:</strong> es un retrato descriptivo, no un puntaje. Sirve para entender el estilo de la persona y preparar la entrevista, no para descartar por sí solo. Combínalo con la prueba técnica y la evaluación clínica.
              </p>
            </div>

            <div className="rounded-3xl p-6" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}` }}>
              <button onClick={() => setShowJson((s) => !s)} className="text-sm font-medium" style={{ color: COLORS.teal }}>
                {showJson ? "Ocultar" : "Ver"} datos que se guardan
              </button>
              {showJson && (
                <pre className="mt-3 rounded-xl p-4 overflow-auto text-xs" style={{ background: "#0F1B1E", color: "#CFE7E3", maxHeight: 220 }}>
{JSON.stringify(payload, null, 2)}
                </pre>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button onClick={submit} className="rounded-xl px-5 py-2.5 text-sm font-medium" style={{ background: COLORS.teal, color: "#fff" }}>
                  {sent === "sending" ? "Enviando…" : sent === "ok" ? "Enviado ✓" : "Enviar al tablero"}
                </button>
                <button onClick={copyJson} className="rounded-xl px-5 py-2.5 text-sm font-medium" style={{ border: `1px solid ${COLORS.line}`, color: COLORS.sub, background: "#fff" }}>
                  {copied ? "Copiado ✓" : "Copiar resultados"}
                </button>
                <button onClick={() => { setStep("intro"); setSectionIdx(0); setAnswers({}); setSent("idle"); }} className="text-sm" style={{ color: COLORS.faint }}>
                  Reiniciar
                </button>
              </div>
              {sent === "err" && (
                <p className="mt-3 text-xs" style={{ color: COLORS.amber }}>
                  Configura WEBAPP_URL con tu Apps Script para guardar automáticamente. Mientras tanto, usa “Copiar resultados”.
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: COLORS.faint }}>
          Autoevaluación de referencia · uso interno de selección
        </p>
      </div>
    </div>
  );
}
