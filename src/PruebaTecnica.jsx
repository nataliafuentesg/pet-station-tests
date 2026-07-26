import React, { useState, useEffect, useMemo } from "react";

/** Prueba técnica — Médico Veterinario (producción).
 *  Usa la MISMA URL de Apps Script que la evaluación de estilo: */
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwtDmt31qfJITUxgBriD4QwxJ9vcDN7GL0MvqglRcZIGYUwraLgsNUMxRfYhzzO8ua9/exec";

const C = {
  paper: "#F4F6FB", surface: "#FFFFFF", ink: "#14213D", sub: "#586182",
  faint: "#9AA6BE", navy: "#152C77", blue: "#2563EB", blueDk: "#1E3A8A",
  soft: "#E7EEFB", line: "#E2E7F1",
};

const CALC = [
  { id: "A1", q: "Perro de 12 kg. Amoxicilina 15 mg/kg. Suspensión 250 mg/5 mL. ¿Cuántos mL administras?", ans: 3.6, tol: 0.1 },
  { id: "A2", q: "Gato de 4 kg. Fluidoterapia de mantenimiento 60 mL/kg/día. ¿A qué velocidad, en mL/h?", ans: 10, tol: 0.5 },
  { id: "A3", q: "Perro de 7,5 kg. Meloxicam 0,2 mg/kg. Suspensión 1,5 mg/mL. ¿Cuántos mL?", ans: 1.0, tol: 0.1 },
  { id: "A4", q: "Perro de 20 kg. Sedante 0,2 mg/kg, concentración 5 mg/mL. ¿Cuántos mL?", ans: 0.8, tol: 0.1 },
];
const MCQ = [
  { id: "B1", q: "¿Cómo debe almacenarse un medicamento de control especial?", opts: ["En el mismo estante que el resto, para acceso rápido", "Bajo llave, con acceso restringido y registro de cada uso", "En la nevera, sin registro", "A la vista del equipo"], correct: 1 },
  { id: "B2", q: "Un medicamento de control especial se venció. ¿Qué haces?", opts: ["Lo descarto en la basura común", "Lo uso hasta agotarlo", "Lo doy de baja documentando y lo dispongo según protocolo, con testigo", "Lo devuelvo sin registro"], correct: 2 },
  { id: "C1", q: "¿Qué combinación NO debe darse simultáneamente por riesgo GI y renal?", opts: ["Antibiótico + probiótico", "AINE (meloxicam) + corticoide", "Antiparasitario + vitamina", "Antiemético + fluidos"], correct: 1 },
  { id: "C2", q: "Antes de anestesia, la valoración mínima incluye:", opts: ["Solo el peso", "Nada si se ve sano", "Examen físico completo y valoración del riesgo anestésico", "Solo la edad"], correct: 2 },
  { id: "C3", q: "Paciente hipotenso y deshidratado. Sobre la acepromacina:", opts: ["Es de elección porque sube la presión", "Debe evitarse o usarse con precaución: puede agravar la hipotensión", "No afecta la presión", "Es un analgésico potente"], correct: 1 },
];
const OPEN = [
  { id: "D1", q: "Perro de 5 años con vómito y diarrea de 2 días, decaído. Describe tu abordaje." },
  { id: "D2", q: "El dueño reporta que el perro comió chocolate hace 1 hora. ¿Tus pasos iniciales y qué datos necesitas?" },
  { id: "B3", q: "¿Cómo llevarías el registro y control de un medicamento de control especial en el día a día?" },
  { id: "D3", q: "Un cliente exige un antibiótico que no está indicado. ¿Cómo manejas la situación?" },
];
const OBJ_TOTAL = CALC.length + MCQ.length;

function useFonts() {
  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(l); return () => document.head.removeChild(l);
  }, []);
}
const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

export default function App() {
  useFonts();
  const [step, setStep] = useState("intro");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const cargo = "Consulta Externa";
  const [calc, setCalc] = useState({}); const [mcq, setMcq] = useState({}); const [open, setOpen] = useState({});
  const [sent, setSent] = useState("idle");

  const objDone = CALC.every((c) => calc[c.id] !== undefined && calc[c.id] !== "") && MCQ.every((m) => mcq[m.id] !== undefined);

  const score = useMemo(() => {
    let s = 0; const detCalc = {}, detMcq = {};
    CALC.forEach((c) => { const v = parseFloat(String(calc[c.id]).replace(",", ".")); const ok = !isNaN(v) && Math.abs(v - c.ans) <= c.tol; detCalc[c.id] = ok; if (ok) s++; });
    MCQ.forEach((m) => { const ok = mcq[m.id] === m.correct; detMcq[m.id] = ok; if (ok) s++; });
    return { s, detCalc, detMcq };
  }, [calc, mcq]);

  async function submit() {
    setSent("sending");
    const payload = {
      tipo: "tecnica", fecha: new Date().toISOString(), nombre: name, email, cargo,
      puntaje: score.s, total: OBJ_TOTAL, detalleCalc: score.detCalc, detalleMCQ: score.detMcq,
      abiertas: OPEN.reduce((o, q) => { o[q.id] = open[q.id] || ""; return o; }, {}),
    };
    try { await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }); setSent("ok"); }
    catch (e) { setSent("err"); }
  }

  const card = { background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" };
  const inputStyle = { border: `1px solid ${C.line}`, ...sans };

  if (step === "intro") return (
    <Shell>
      <div className="rounded-3xl p-8" style={card}>
        <h1 style={{ ...serif, fontSize: 36, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>Prueba técnica<br />Médico Veterinario</h1>
        <p className="mt-4" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Cálculo de dosis, manejo de medicamentos, farmacología y casos clínicos. Tiempo sugerido: 40 minutos. Puedes usar calculadora.</p>
        <div className="mt-7 grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="w-full rounded-xl px-4 py-3 outline-none" style={inputStyle} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo" className="w-full rounded-xl px-4 py-3 outline-none" style={inputStyle} />
        </div>
        <button onClick={() => setStep("test")} className="mt-6 w-full rounded-xl py-3.5 font-medium" style={{ background: C.blue, color: "#fff", fontSize: 16 }}>Comenzar la prueba</button>
      </div>
    </Shell>
  );

  if (step === "done") return (
    <Shell>
      <div className="rounded-3xl p-10 text-center" style={card}>
        <div className="mx-auto rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: C.soft }}>
          <span style={{ color: C.blue, fontSize: 28 }}>✓</span>
        </div>
        <h1 className="mt-5" style={{ ...serif, fontSize: 30, fontWeight: 500, color: C.navy }}>¡Gracias, {name || "por participar"}!</h1>
        <p className="mt-3" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Recibimos tu prueba. Nuestro equipo médico la revisará y te contactaremos con los siguientes pasos.</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="grid gap-5">
        <Block card={card} title="Sección A · Cálculo de dosis" hint="Escribe el valor a administrar (mL), salvo A2 (mL/h).">
          {CALC.map((c) => (
            <div key={c.id} className="mb-5">
              <p className="text-sm mb-2" style={{ color: C.ink }}><b>{c.id}.</b> {c.q}</p>
              <input value={calc[c.id] ?? ""} onChange={(e) => setCalc((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="Tu respuesta" inputMode="decimal" className="rounded-xl px-4 py-2.5 outline-none" style={{ border: `1px solid ${C.line}`, width: 180 }} />
            </div>
          ))}
        </Block>

        <Block card={card} title="Sección B · Farmacología y control especial">
          {MCQ.map((m) => (
            <div key={m.id} className="mb-5">
              <p className="text-sm mb-2" style={{ color: C.ink }}><b>{m.id}.</b> {m.q}</p>
              <div className="grid gap-2">
                {m.opts.map((o, idx) => {
                  const chosen = mcq[m.id] === idx;
                  return (
                    <button key={idx} onClick={() => setMcq((s) => ({ ...s, [m.id]: idx }))} className="text-left rounded-xl px-4 py-2.5 text-sm transition-all"
                      style={{ border: `1.5px solid ${chosen ? C.blue : C.line}`, background: chosen ? C.soft : "#fff", color: C.ink }}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Block>

        <Block card={card} title="Sección C · Casos clínicos" hint="Responde con tus propias palabras. Las revisa un veterinario.">
          {OPEN.map((q) => (
            <div key={q.id} className="mb-5">
              <p className="text-sm mb-2" style={{ color: C.ink }}><b>{q.id}.</b> {q.q}</p>
              <textarea value={open[q.id] ?? ""} onChange={(e) => setOpen((s) => ({ ...s, [q.id]: e.target.value }))} rows={4} className="w-full rounded-xl px-4 py-3 outline-none resize-y" style={{ border: `1px solid ${C.line}`, ...sans }} />
            </div>
          ))}
        </Block>

        <div className="rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3" style={card}>
          <span className="text-sm" style={{ color: C.faint }}>{objDone ? "Todo listo para enviar." : "Completa las secciones A y B para enviar."}</span>
          <button disabled={!objDone || sent === "sending"} onClick={async () => { await submit(); setStep("done"); }} className="rounded-xl px-6 py-3 font-medium"
            style={{ background: objDone ? C.blue : C.line, color: objDone ? "#fff" : C.faint, cursor: objDone ? "pointer" : "not-allowed" }}>
            {sent === "sending" ? "Enviando…" : "Enviar prueba"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen w-full flex items-start justify-center py-10 px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
      <div className="w-full" style={{ maxWidth: 640 }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
          <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.18em" }}>Prueba técnica · Médico Veterinario</span>
        </div>
        {children}
        <p className="text-center text-xs mt-8" style={{ color: C.faint }}>Uso interno de selección</p>
      </div>
    </div>
  );
}

function Block({ title, hint, children, card }) {
  return (
    <div className="rounded-3xl p-7" style={card}>
      <h2 style={{ ...serif, fontSize: 22, fontWeight: 500, color: C.navy }}>{title}</h2>
      {hint && <p className="mt-1 mb-5 text-sm" style={{ color: C.faint }}>{hint}</p>}
      {!hint && <div className="mb-5" />}
      {children}
    </div>
  );
}