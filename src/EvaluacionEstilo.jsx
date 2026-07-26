import React, { useState, useEffect, useMemo } from "react";

/** Evaluación de estilo de trabajo — producción.
 *  Pega tu URL de Apps Script (Web App) aquí abajo: */
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwtDmt31qfJITUxgBriD4QwxJ9vcDN7GL0MvqglRcZIGYUwraLgsNUMxRfYhzzO8ua9/exec";

const C = {
  paper: "#F4F6FB", surface: "#FFFFFF", ink: "#14213D", sub: "#586182",
  faint: "#9AA6BE", navy: "#152C77", blue: "#2563EB", blueDk: "#1E3A8A",
  soft: "#E7EEFB", line: "#E2E7F1",
};

const SECTIONS = [
  { id: "cognitivo", title: "Cómo piensas y decides", left: "Análisis y método", right: "Agilidad y espontaneidad",
    items: [{ left: "Analítico(a)", right: "Rápido(a)" }, { left: "Metódico(a)", right: "Espontáneo(a)" }, { left: "Deliberado(a)", right: "Impulsivo(a)" }],
    iL: "Prefieres entender antes de actuar: analizas, revisas datos y sigues un método.",
    iR: "Te mueves rápido y con intuición; decides sobre la marcha sin sobre-analizar.",
    iB: "Combinas análisis con agilidad según lo pida la situación.",
    sL: "Decisiones bien fundamentadas y menos errores por precipitación.", sR: "Rapidez para resolver y adaptarse a un ritmo alto.",
    wL: "En urgencias, ¿decide a tiempo sin sobre-analizar?", wR: "En dosis y diagnósticos, ¿se toma el tiempo de verificar?" },
  { id: "orden", title: "Orden y ejecución", left: "Orden y precisión", right: "Flexibilidad y practicidad",
    items: [{ left: "Organizado(a)", right: "Flexible" }, { left: "Preciso(a)", right: "Práctico(a)" }, { left: "Sigo procesos", right: "Improviso" }],
    iL: "Trabajas con orden: procesos, registros y precisión son tu terreno.",
    iR: "Eres flexible y práctica; te adaptas y priorizas lo esencial sobre el procedimiento.",
    iB: "Mantienes orden sin volverte rígida.",
    sL: "Rigor con protocolos, historias clínicas y manejo de medicamentos.", sR: "Adaptabilidad cuando el día se sale del plan.",
    wL: "¿Se frustra cuando toca improvisar?", wR: "En registros y dosis, ¿mantiene el rigor aunque haya prisa?" },
  { id: "personas", title: "Relación con los demás", left: "Orientación a las personas", right: "Foco en la tarea",
    items: [{ left: "Orientado(a) al cliente", right: "Orientado(a) a la tarea" }, { left: "Empático(a)", right: "Objetivo(a)" }, { left: "Colaborador(a)", right: "Autónomo(a)" }],
    iL: "Pones a las personas primero: escuchas, explicas y cuidas el vínculo con el cliente.",
    iR: "Te enfocas en resolver la tarea; lo técnico pesa más que el trato.",
    iB: "Equilibras trato humano y resultado técnico.",
    sL: "Atención al cliente y manejo de dueños preocupados.", sR: "Eficiencia y foco en resolver el caso.",
    wL: "¿Sostiene el foco técnico cuando el trato demanda mucho?", wR: "En consulta, ¿conecta con dueños difíciles?" },
  { id: "presion", title: "Bajo presión", left: "Calma y estabilidad", right: "Intensidad y reactividad",
    items: [{ left: "Tranquilo(a) bajo presión", right: "Me acelero" }, { left: "Constante", right: "Cambiante" }, { left: "Resiliente al estrés", right: "Sensible al estrés" }],
    iL: "Mantienes la calma y un ritmo estable, incluso bajo presión.",
    iR: "Trabajas con intensidad y reaccionas rápido; el estrés te activa.",
    iB: "Sostienes la calma sin perder energía.",
    sL: "Serenidad en urgencias y multitarea.", sR: "Energía y respuesta rápida ante lo inesperado.",
    wL: "¿Mantiene el sentido de urgencia cuando hace falta?", wR: "¿Cómo se recupera tras un día muy cargado o un caso duro?" },
  { id: "iniciativa", title: "Iniciativa", left: "Iniciativa y proactividad", right: "Ejecución guiada",
    items: [{ left: "Proactivo(a)", right: "Espero indicaciones" }, { left: "Propongo mejoras", right: "Sigo lo establecido" }, { left: "Decido con autonomía", right: "Consulto primero" }],
    iL: "Tomas la iniciativa: propones, decides y te organizas sin que te empujen.",
    iR: "Prefieres instrucciones claras y ejecutar lo definido.",
    iB: "Tomas iniciativa y también sabes seguir lo establecido.",
    sL: "Autonomía y mejora continua (clave para liderar).", sR: "Confiabilidad siguiendo protocolos definidos.",
    wL: "¿Consulta cuando el caso lo exige, o decide de más?", wR: "En un rol autónomo, ¿avanza sin supervisión constante?" },
];
const TOTAL = SECTIONS.reduce((n, s) => n + s.items.length, 0);

const FIT = {
  "Consulta Externa": { cognitivo: 3.5, orden: 2.5, personas: 2.0, presion: 2.5, iniciativa: 4.0 },
  "Director Médico": { cognitivo: 2.5, orden: 2.5, personas: 4.0, presion: 3.0, iniciativa: 2.5 },
};

function useFonts() {
  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(l); return () => document.head.removeChild(l);
  }, []);
}
const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

function lean(mean, s) {
  const d = mean - 4;
  if (Math.abs(d) < 0.7) return { side: "bal", label: `equilibrio entre ${s.left.toLowerCase()} y ${s.right.toLowerCase()}`, interp: s.iB };
  const strong = Math.abs(d) >= 1.6;
  if (d < 0) return { side: "left", label: (strong ? "marcada " : "") + s.left.toLowerCase(), interp: s.iL, strength: s.sL, watch: s.wL };
  return { side: "right", label: (strong ? "marcada " : "") + s.right.toLowerCase(), interp: s.iR, strength: s.sR, watch: s.wR };
}

function Dot({ active, onClick }) {
  return <button onClick={onClick} className="rounded-full transition-all duration-150"
    style={{ width: active ? 22 : 14, height: active ? 22 : 14, background: active ? C.blue : "#fff",
      border: `2px solid ${active ? C.blue : C.faint}`, boxShadow: active ? `0 2px 8px ${C.blue}55` : "none", cursor: "pointer" }} />;
}

export default function App() {
  useFonts();
  const [step, setStep] = useState("intro");
  const [si, setSi] = useState(0);
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [ans, setAns] = useState({}); const [sent, setSent] = useState("idle");
  const answered = Object.keys(ans).length;

  const results = useMemo(() => SECTIONS.map((s) => {
    const v = s.items.map((_, i) => ans[`${s.id}-${i}`]).filter(Boolean);
    const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 4;
    return { id: s.id, title: s.title, s, mean, ln: lean(mean, s) };
  }), [ans]);

  const summary = useMemo(() => {
    const L = results.filter((r) => r.ln.side !== "bal").map((r) => r.ln.label);
    const B = results.filter((r) => r.ln.side === "bal");
    let out = L.length ? "Tu perfil se inclina hacia " + L.join(", ") + "." : "";
    if (B.length) out += (out ? " " : "") + "Muestras equilibrio en " + B.map((b) => b.title.toLowerCase()).join(" y ") + ".";
    return out || "Perfil equilibrado en las cinco dimensiones.";
  }, [results]);

  const fit = useMemo(() => {
    const means = results.reduce((o, r) => { o[r.id] = r.mean; return o; }, {});
    const score = (t) => Object.keys(t).reduce((a, k) => a + Math.abs(means[k] - t[k]), 0);
    const ce = score(FIT["Consulta Externa"]), dm = score(FIT["Director Médico"]);
    return { best: ce <= dm ? "Consulta Externa" : "Director Médico", ce, dm };
  }, [results]);

  const strengths = results.filter((r) => r.ln.strength).map((r) => r.ln.strength).slice(0, 4);
  const watches = results.filter((r) => r.ln.watch).map((r) => r.ln.watch).slice(0, 3);

  const payload = useMemo(() => ({
    tipo: "perfil", fecha: new Date().toISOString(), nombre: name, email,
    dimensiones: results.reduce((o, r) => { o[r.id] = { media: +r.mean.toFixed(2), tendencia: r.ln.label }; return o; }, {}),
    resumen: summary, encajeSugerido: fit.best, respuestas: ans,
  }), [name, email, results, summary, fit, ans]);

  const sec = SECTIONS[si];
  const secDone = sec?.items.every((_, i) => ans[`${sec.id}-${i}`]);

  async function submit() {
    setSent("sending");
    try { await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }); setSent("ok"); }
    catch (e) { setSent("err"); }
  }

  const card = { background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" };

  return (
    <div className="min-h-screen w-full flex items-start justify-center py-10 px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
      <div className="w-full" style={{ maxWidth: 620 }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
          <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.18em" }}>Evaluación de estilo de trabajo</span>
        </div>

        {step === "intro" && (
          <div className="rounded-3xl p-8" style={card}>
            <h1 style={{ ...serif, fontSize: 40, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>¿Cómo trabajas<br />cuando estás en tu elemento?</h1>
            <p className="mt-4" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Son 15 preguntas rápidas. No hay respuestas correctas: te ubicas entre dos formas de ser, según cómo te describirías en el trabajo. Al final verás tu perfil.</p>
            <div className="mt-7 grid gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="w-full rounded-xl px-4 py-3 outline-none" style={{ border: `1px solid ${C.line}` }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo" className="w-full rounded-xl px-4 py-3 outline-none" style={{ border: `1px solid ${C.line}` }} />
            </div>
            <button onClick={() => setStep("quiz")} className="mt-6 w-full rounded-xl py-3.5 font-medium" style={{ background: C.blue, color: "#fff", fontSize: 16 }}>Comenzar</button>
          </div>
        )}

        {step === "quiz" && (
          <div>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: C.sub }}>Sección {si + 1} de {SECTIONS.length}</span>
                <span className="text-sm" style={{ color: C.faint }}>{answered}/{TOTAL}</span>
              </div>
              <div className="w-full rounded-full" style={{ height: 6, background: C.line }}>
                <div className="rounded-full transition-all duration-300" style={{ height: 6, width: `${(answered / TOTAL) * 100}%`, background: C.blue }} />
              </div>
            </div>
            <div className="rounded-3xl p-7" style={card}>
              <h2 style={{ ...serif, fontSize: 26, fontWeight: 500, color: C.navy }}>{sec.title}</h2>
              <p className="mt-1 mb-6 text-sm" style={{ color: C.faint }}>Elige el punto que más te representa.</p>
              <div className="grid gap-7">
                {sec.items.map((it, i) => {
                  const v = ans[`${sec.id}-${i}`];
                  return (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-right" style={{ color: v && v < 4 ? C.ink : C.sub, width: 96, fontWeight: v && v < 4 ? 600 : 400 }}>{it.left}</span>
                      <div className="flex items-center justify-between" style={{ maxWidth: 260, width: "100%" }}>
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => <Dot key={n} active={v === n} onClick={() => setAns((a) => ({ ...a, [`${sec.id}-${i}`]: n }))} />)}
                      </div>
                      <span className="text-sm" style={{ color: v && v > 4 ? C.ink : C.sub, width: 96, fontWeight: v && v > 4 ? 600 : 400 }}>{it.right}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between mt-5">
              <button onClick={() => si === 0 ? setStep("intro") : setSi((x) => x - 1)} className="rounded-xl px-5 py-2.5 text-sm font-medium" style={{ color: C.sub, border: `1px solid ${C.line}`, background: "#fff" }}>Atrás</button>
              {si < SECTIONS.length - 1
                ? <button disabled={!secDone} onClick={() => setSi((x) => x + 1)} className="rounded-xl px-6 py-2.5 text-sm font-medium" style={{ background: secDone ? C.blue : C.line, color: secDone ? "#fff" : C.faint, cursor: secDone ? "pointer" : "not-allowed" }}>Siguiente</button>
                : <button disabled={answered < TOTAL} onClick={() => setStep("results")} className="rounded-xl px-6 py-2.5 text-sm font-medium" style={{ background: answered >= TOTAL ? C.blue : C.line, color: answered >= TOTAL ? "#fff" : C.faint, cursor: answered >= TOTAL ? "pointer" : "not-allowed" }}>Ver mi perfil</button>}
            </div>
          </div>
        )}

        {step === "results" && (
          <div className="grid gap-5">
            <div className="rounded-3xl p-8" style={card}>
              <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.16em" }}>Perfil de estilo de trabajo</span>
              <h1 className="mt-1" style={{ ...serif, fontSize: 34, fontWeight: 500, color: C.navy }}>{name || "Tu perfil"}</h1>
              <p className="mt-3" style={{ ...serif, fontSize: 19, lineHeight: 1.55, fontStyle: "italic" }}>{summary}</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: C.soft }}>
                <span className="text-xs" style={{ color: C.sub }}>Encaje orientativo:</span>
                <span className="text-sm font-semibold" style={{ color: C.navy }}>{fit.best}</span>
              </div>
            </div>

            <div className="rounded-3xl p-7" style={card}>
              <h2 className="mb-5" style={{ ...serif, fontSize: 22, fontWeight: 500, color: C.navy }}>Dónde te ubicas</h2>
              <div className="grid gap-6">
                {results.map((r) => {
                  const pct = ((r.mean - 1) / 6) * 100;
                  return (
                    <div key={r.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs" style={{ color: C.sub, width: 140 }}>{r.s.left}</span>
                        <span className="text-xs text-right" style={{ color: C.sub, width: 140 }}>{r.s.right}</span>
                      </div>
                      <div className="relative w-full rounded-full" style={{ height: 8, background: C.soft }}>
                        <div className="absolute rounded-full transition-all duration-500" style={{ top: -4, height: 16, width: 16, left: `${pct}%`, transform: "translateX(-50%)", background: C.blue, border: "3px solid #fff", boxShadow: `0 2px 8px ${C.blue}55` }} />
                      </div>
                      <p className="mt-2 text-xs" style={{ color: C.sub, lineHeight: 1.5 }}>{r.ln.interp}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-3xl p-6" style={card}>
                <h3 className="mb-3" style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.navy }}>Fortalezas probables</h3>
                {strengths.map((s, i) => <p key={i} className="text-sm mb-2" style={{ color: C.ink }}>· {s}</p>)}
              </div>
              <div className="rounded-3xl p-6" style={card}>
                <h3 className="mb-3" style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.navy }}>A explorar en la entrevista</h3>
                {watches.map((w, i) => <p key={i} className="text-sm mb-2" style={{ color: C.ink }}>· {w}</p>)}
              </div>
            </div>

            <div className="rounded-3xl p-6" style={{ background: C.soft, border: `1px solid ${C.line}` }}>
              <p className="text-sm" style={{ color: C.ink, lineHeight: 1.6 }}><strong>Cómo se lee:</strong> es un retrato descriptivo, no un puntaje. Complementa la entrevista y la evaluación clínica; no descarta por sí solo.</p>
            </div>

            <div className="rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3" style={card}>
              {sent === "ok"
                ? <span className="text-sm font-medium" style={{ color: C.blueDk }}>✓ ¡Listo! Recibimos tus respuestas.</span>
                : <button onClick={submit} className="rounded-xl px-6 py-3 font-medium" style={{ background: C.blue, color: "#fff" }}>{sent === "sending" ? "Enviando…" : "Enviar mis respuestas"}</button>}
              {sent === "err" && <span className="text-sm" style={{ color: "#B54708" }}>No se pudo enviar. Reintenta.</span>}
            </div>
          </div>
        )}
        <p className="text-center text-xs mt-8" style={{ color: C.faint }}>Autoevaluación de referencia · uso interno de selección</p>
      </div>
    </div>
  );
}