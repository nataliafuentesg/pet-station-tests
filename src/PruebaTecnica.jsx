import React, { useState, useEffect, useMemo, useRef } from "react";

/* ================== CONFIG ================== */
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwtDmt31qfJITUxgBriD4QwxJ9vcDN7GL0MvqglRcZIGYUwraLgsNUMxRfYhzzO8ua9/exec";
const REQUIRE_TOKEN = true;      // false = modo prueba libre (sin token, sin control de reintento)
const DURACION_SEG = 45 * 60;    // 45 minutos
const REPORTE_EMAIL = "community.manager@petstationvet.com";

// URLs de los PDFs de Cuadro Hemático (Sustituye por las URLs reales alojadas en tu servidor o Cloudflare)
const PDF_ATUN = "https://pet-station-tests.vercel.app/documentos/ch-atun.pdf"; 
const PDF_DANTE_CH = "https://pet-station-tests.vercel.app/documentos/ch-dante.pdf";
const PDF_DANTE_DIAGNOSTICO = "https://pet-station-tests.vercel.app/documentos/dc-dante.pdf";

/* ============================================ */

const C = { 
  paper: "#F4F6FB", 
  surface: "#FFFFFF", 
  ink: "#14213D", 
  sub: "#586182", 
  faint: "#9AA6BE", 
  navy: "#152C77", 
  blue: "#2563EB", 
  blueDk: "#1E3A8A", 
  soft: "#E7EEFB", 
  line: "#E2E7F1", 
  warn: "#B54708", 
  warnBg: "#FEF0E7" 
};

const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

/* ================== BANCO DE PREGUNTAS ================== */

// SECCIÓN A: CÁLCULOS
const CALC = [
  { id: "A1", q: "Perro de 12 kg. Amoxicilina 15 mg/kg. Suspensión 250 mg/5 mL. ¿Cuántos mL administras?", ans: 3.6, tol: 0.1 },
  { id: "A2", q: "Gato de 4 kg. Fluidoterapia de mantenimiento 60 mL/kg/día. ¿A qué velocidad, en mL/h?", ans: 10, tol: 0.5 },
  { id: "A3", q: "Perro de 7,5 kg. Meloxicam 0,2 mg/kg. Suspensión 1,5 mg/mL. ¿Cuántos mL?", ans: 1.0, tol: 0.1 },
  { id: "A4", q: "Perro de 20 kg. Sedante 0,2 mg/kg, concentración 5 mg/mL. ¿Cuántos mL?", ans: 0.8, tol: 0.1 },
];

// SECCIÓN B: FARMACOLOGÍA Y NORMATIVA
const MCQ = [
  { id: "B1", q: "¿Cómo debe almacenarse un medicamento de control especial?", opts: ["En el mismo estante que el resto, para acceso rápido", "Bajo llave, con acceso restringido y registro de cada uso", "En la nevera, sin registro", "A la vista del equipo"], correct: 1 },
  { id: "B2", q: "Un medicamento de control especial se venció. ¿Qué haces?", opts: ["Lo descarto en la basura común", "Lo uso hasta agotarlo", "Lo doy de baja documentando y lo dispongo según protocolo, con testigo", "Lo devuelvo sin registro"], correct: 2 },
  { id: "C1", q: "¿Qué combinación NO debe darse simultáneamente por riesgo GI y renal?", opts: ["Antibiótico + probiótico", "AINE (meloxicam) + corticoide", "Antiparasitario + vitamina", "Antiemético + fluidos"], correct: 1 },
  { id: "C2", q: "Antes de anestesia, la valoración mínima incluye:", opts: ["Solo el peso", "Nada si se ve sano", "Examen físico completo y valoración del riesgo anestésico", "Solo la edad"], correct: 2 },
  { id: "C3", q: "Paciente hipotenso y deshidratado. Sobre la acepromacina:", opts: ["Es de elección porque sube la presión", "Debe evitarse o usarse con precaución: puede agravar la hipotensión", "No afecta la presión", "Es un analgésico potente"], correct: 1 },
];

// SECCIÓN C: GESTIÓN DE TIEMPO, CONFLICTOS Y CALAMIDADES PERSONALES
const MCQ_MANAGEMENT = [
  { 
    id: "M1", 
    q: "Tienes 3 pacientes esperando: (1) Consulta de vacuna de rutina, (2) Felino con disnea severa y mucosas cianóticas, (3) Canino con otitis crónica de cita agendada. ¿En qué orden atiendes/triajas?", 
    opts: [
      "Atiendo por orden de llegada estricto para ser justo.",
      "Atiendo primero al felino con disnea (urgencia vital), luego la cita agendada y finalmente la vacuna.",
      "Atiendo rápido la vacuna para salir de ella, luego el felino disneico.",
      "Pido al auxiliar que estabilice al felino y sigo con la consulta programada sin intervenir."
    ], 
    correct: 1 
  },
  { 
    id: "M2", 
    q: "Un propietario llega muy alterado y gritando en recepción porque su mascota lleva 20 minutos de espera debido a una urgencia médica ingresada de imprevisto. ¿Cuál es tu postura?", 
    opts: [
      "Le respondo con la misma firmeza para que entienda que hay prioridades médicas y no debe gritar.",
      "Me aíslo en el consultorio y le pido al recepcionista que lo maneje hasta que se calme.",
      "Escucho con empatía, valido su molestia, explico con calma la situación de la urgencia e informo el tiempo estimado de atención.",
      "Atiendo inmediatamente a su mascota para evitar una queja formal, dejando la urgencia en pausa."
    ], 
    correct: 2 
  },
  { 
    id: "M3", 
    q: "Un colega del turno anterior cometió un error en la dosis de un medicamento administrado a un paciente hospitalizado. ¿Cómo reaccionas?", 
    opts: [
      "Lo critico frente al equipo para que todos aprendan del error.",
      "Corrijo la situación clínica del paciente de inmediato, documento el hallazgo y hablo en privado con el colega/dirección médica de forma constructiva.",
      "Igualo el error en la historia clínica para proteger al colega y no generar alarma.",
      "Le digo al propietario directamente que el veterinario anterior se equivocó."
    ], 
    correct: 1 
  },
  {
    id: "M4",
    q: "Imagina que camino a la clínica o durante tu turno se te presenta una calamidad doméstica / emergencia familiar grave. ¿Cómo manejas esta situación frente a tus pacientes y el equipo?",
    opts: [
      "Me retiro inmediatamente sin avisar a nadie, ya que la familia es lo primero.",
      "Informo de inmediato al director médico o colega de turno, entrego un reporte claro de los pacientes/urgencias pendientes para coordinar el empalme y solicito el permiso correspondiente.",
      "Intento resolver el problema personal por teléfono mientras atiendo consultas, sin comunicarlo al equipo.",
      "Me quedo a cumplir el turno completo sin importar la gravedad del imprevisto y sin avisar que no estoy en condiciones de atender."
    ],
    correct: 1
  }
];

// SECCIÓN D: CASOS CLÍNICOS REALES DE LA CLÍNICA (CON PDF)
const CLINICAL_CASES = [
  {
    id: "CASE_ATUN",
    patient: "Atún",
    details: "Gato / 1.5 años / Adoptado hace 1 año / Vacunas y desparasitación al día.",
    history: "Presenta desde hace 2 meses: mucosas pálidas, decaimiento, pérdida de peso progresiva, anorexia, taquicardia y un soplo cardíaco Grado IV/VI auscultado en consulta.",
    pdfUrl: PDF_ATUN,
    prompt: "Con base en la anamnesis, el examen físico y el Cuadro Hemático adjunto (PDF): ¿Cuál es tu lista de diagnósticos diferenciales, qué pruebas complementarias inmediatas solicitas y cuál es la ruta diagnóstica / conducta terapéutica que manejarías?"
  },
  {
    id: "CASE_DANTE",
    patient: "Dante",
    details: "Canino / 14 años / Caniche (Poodle) entero / Déficit sensorial (Sordo y Ciego).",
    history: "Paciente geronte que acude por tos paroxística de larga data que empeora con la excitación, debilidad progresiva del tren posterior con dificultad para levantarse, y el propietario nota recientemente una masa eritro-ulcerada/mucosa protruyente en la región perianal.",
    pdfs: [
      { name: "Cuadro Hemático", url: PDF_DANTE_CH },
      { name: "Reporte de Diagnóstico Completo", url: PDF_DANTE_DIAGNOSTICO }
    ],
    prompt: "Con base en los reportes adjuntos (Cuadro Hemático y Diagnóstico Completo) y el cuadro clínico multifactorial de Dante (tos paroxística, debilidad posterior y masa perianal): 1) Identifica los hallazgos hematológicos y clínicos relevantes. 2) Prioriza tus diagnósticos diferenciales para cada síntoma. 3) ¿Qué pruebas complementarias priorizarías considerando su edad y condición (ciego/sordo)? 4) Define un plan terapéutico y de manejo paliativo/calidad de vida adaptado."
  }
];

// SECCIÓN E: PREGUNTAS ABIERTAS Y SITUACIONES PERSONALES
const OPEN = [
  { id: "D1", q: "Perro de 5 años con vómito y diarrea de 2 días, decaído. Describe tu abordaje sistemático." },
  { id: "D2", q: "El dueño reporta que el perro comió chocolate hace 1 hora. ¿Tus pasos iniciales y qué datos necesitas?" },
  { id: "B3", q: "¿Cómo llevarías el registro y control de un medicamento de control especial en el día a día?" },
  { id: "D3", q: "Un cliente exige un antibiótico de amplio espectro que no está indicado clínicamente. ¿Cómo manejas la situación?" },
  { id: "M5", q: "Si estás en medio de un turno de alta carga asistencial y atraviesas un problema personal difícil que afecta tu ánimo o concentración, ¿qué estrategias usas para separar lo personal de lo profesional y garantizar la seguridad de los pacientes?" },
];

const OBJ_TOTAL = CALC.length + MCQ.length + MCQ_MANAGEMENT.length;

/* ---- helpers ---- */
const qp = (k) => { try { return new URLSearchParams(window.location.search).get(k) || ""; } catch (e) { return ""; } };
const ls = (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) {} };
function jsonp(url) {
  return new Promise((res, rej) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    const s = document.createElement("script");
    window[cb] = (d) => { res(d); try { delete window[cb]; } catch (e) {} s.remove(); };
    s.onerror = () => { rej(new Error("net")); s.remove(); };
    s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    document.body.appendChild(s);
    setTimeout(() => { if (window[cb]) { try { delete window[cb]; } catch (e) {} s.remove(); rej(new Error("timeout")); } }, 10000);
  });
}
const mmss = (s) => { const m = Math.max(0, Math.floor(s / 60)), r = Math.max(0, s % 60); return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`; };

function useFonts() {
  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(l); return () => document.head.removeChild(l);
  }, []);
}

export default function App() {
  useFonts();
  const [phase, setPhase] = useState("loading"); // loading|invalid|already|intro|instructions|test|done|expired
  const [reason, setReason] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState(""); 
  const [email, setEmail] = useState("");
  
  const [calc, setCalc] = useState({}); 
  const [mcq, setMcq] = useState({}); 
  const [mcqMgmt, setMcqMgmt] = useState({});
  const [cases, setCases] = useState({});
  const [open, setOpen] = useState({});

  const [start, setStart] = useState(null);
  const [remaining, setRemaining] = useState(DURACION_SEG);
  const [sent, setSent] = useState("idle");
  const sentRef = useRef("idle");

  const startKey = `start-tecnica-${token || "test"}`;
  const doneKey = `done-tecnica-${token || "test"}`;

  const score = useMemo(() => {
    let s = 0; const dc = {}, dm = {}, dmm = {};
    CALC.forEach((c) => { const v = parseFloat(String(calc[c.id]).replace(",", ".")); const ok = !isNaN(v) && Math.abs(v - c.ans) <= c.tol; dc[c.id] = ok; if (ok) s++; });
    MCQ.forEach((m) => { const ok = mcq[m.id] === m.correct; dm[m.id] = ok; if (ok) s++; });
    MCQ_MANAGEMENT.forEach((m) => { const ok = mcqMgmt[m.id] === m.correct; dmm[m.id] = ok; if (ok) s++; });
    return { s, dc, dm, dmm };
  }, [calc, mcq, mcqMgmt]);

  // ---- mount: token / attempt / resume ----
  useEffect(() => {
    const tk = qp("token"); setToken(tk);
    const dk = `done-tecnica-${tk || "test"}`;
    if (ls(dk)) { setPhase("already"); return; }
    if (!REQUIRE_TOKEN) { setPhase("intro"); return; }
    if (!tk) { setReason("sin_token"); setPhase("invalid"); return; }
    jsonp(`${WEBAPP_URL}?action=check&token=${encodeURIComponent(tk)}&tipo=tecnica`)
      .then((r) => {
        if (!r || !r.valid) { setReason(r ? r.reason : "error"); setPhase("invalid"); return; }
        setName(r.nombre || ""); setEmail(r.email || "");
        const st = ls(`start-tecnica-${tk}`);
        if (st) {
          const el = Math.floor((Date.now() - parseInt(st)) / 1000);
          if (el >= DURACION_SEG) { setPhase("expired"); return; }
          setStart(parseInt(st)); setRemaining(DURACION_SEG - el); setPhase("test"); return;
        }
        setPhase("instructions");
      })
      .catch(() => { setReason("error"); setPhase("invalid"); });
  }, []);

  // ---- timer ----
  useEffect(() => {
    if (phase !== "test" || !start) return;
    const id = setInterval(() => {
      const rem = DURACION_SEG - Math.floor((Date.now() - start) / 1000);
      setRemaining(rem);
      if (rem <= 0) { clearInterval(id); finish(true); }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, start]);

  function beginTest() {
    const t = Date.now(); lsSet(startKey, String(t));
    setStart(t); setRemaining(DURACION_SEG); setPhase("test");
  }

  async function finish(auto) {
    if (sentRef.current !== "idle") return;
    sentRef.current = "sending"; setSent("sending");
    const tiempo = start ? Math.round((Date.now() - start) / 1000) : null;
    const payload = {
      tipo: "tecnica", token, fecha: new Date().toISOString(), nombre: name, email, cargo: "Consulta Externa",
      puntaje: score.s, total: OBJ_TOTAL, 
      detalleCalc: score.dc, 
      detalleMCQ: score.dm, 
      detalleGestion: score.dmm,
      casosClinicos: CLINICAL_CASES.reduce((o, c) => { o[c.id] = cases[c.id] || ""; return o; }, {}),
      abiertas: OPEN.reduce((o, q) => { o[q.id] = open[q.id] || ""; return o; }, {}),
      tiempoSeg: tiempo, autoenviado: !!auto,
    };
    try { await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }); } catch (e) {}
    lsSet(doneKey, "1"); sentRef.current = "ok"; setSent("ok"); setPhase("done");
  }

  const objDone = CALC.every((c) => calc[c.id] !== undefined && calc[c.id] !== "") && 
                  MCQ.every((m) => mcq[m.id] !== undefined) &&
                  MCQ_MANAGEMENT.every((m) => mcqMgmt[m.id] !== undefined);

  const card = { background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" };
  const input = { border: `1px solid ${C.line}`, ...sans };

  /* ---------- screens ---------- */
  if (phase === "loading") return <Shell><Center>Cargando…</Center></Shell>;

  if (phase === "invalid") return <Shell><Message title="Enlace no válido"
    body={reason === "usada" ? "Esta prueba ya fue completada con este enlace." : reason === "sin_token" ? "Necesitas el enlace personal que te enviamos por correo." : reason === "tipo_incorrecto" ? "Este enlace no corresponde a esta prueba." : "No pudimos validar tu enlace."}
    foot={`Si crees que es un error, escríbenos a ${REPORTE_EMAIL}.`} /></Shell>;

  if (phase === "already") return <Shell><Message title="Prueba completada" body="Ya enviaste esta prueba. ¡Gracias!" /></Shell>;

  if (phase === "expired") return <Shell><Message title="Se acabó el tiempo"
    body="El tiempo para esta prueba terminó." foot={`Si tuviste un problema técnico, escríbenos a ${REPORTE_EMAIL} para reactivarla.`} /></Shell>;

  if (phase === "done") return <Shell><div className="rounded-3xl p-10 text-center" style={card}>
    <div className="mx-auto rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: C.soft }}><span style={{ color: C.blue, fontSize: 28 }}>✓</span></div>
    <h1 className="mt-5" style={{ ...serif, fontSize: 30, fontWeight: 500, color: C.navy }}>¡Gracias, {name || "por participar"}!</h1>
    <p className="mt-3" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Recibimos tu prueba. Nuestro equipo médico la revisará detalladamente y te contactaremos para los siguientes pasos.</p>
  </div></Shell>;

  if (phase === "intro") return <Shell><div className="rounded-3xl p-8" style={card}>
    <h1 style={{ ...serif, fontSize: 34, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>Prueba técnica<br />Médico Veterinario</h1>
    <p className="mt-4" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Modo prueba libre. Ingresa tus datos para comenzar.</p>
    <div className="mt-6 grid gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo" className="w-full rounded-xl px-4 py-3 outline-none" style={input} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo electrónico" className="w-full rounded-xl px-4 py-3 outline-none" style={input} />
    </div>
    <button onClick={() => setPhase("instructions")} className="mt-6 w-full rounded-xl py-3.5 font-medium cursor-pointer" style={{ background: C.blue, color: "#fff", fontSize: 16 }}>Continuar</button>
  </div></Shell>;

  if (phase === "instructions") return <Shell><div className="rounded-3xl p-8" style={card}>
    <h1 style={{ ...serif, fontSize: 30, fontWeight: 500, color: C.navy }}>Antes de empezar{name ? `, ${name}` : ""}</h1>
    <div className="mt-5 grid gap-3">
      <Rule n="⏱" t={`Tienes ${DURACION_SEG / 60} minutos. El tiempo corre desde que inicias y se auto-envía al finalizar.`} />
      <Rule n="①" t="Es un solo intento. No recargues ni cierres la página durante el proceso." />
      <Rule n="📋" t="Evaluamos: Cálculos de dosis, Farmacología, Gestión del tiempo/conflictos/calamidades personales y Casos Clínicos Reales con PDF." />
      <Rule n="📄" t="En los casos clínicos de la clínica, podrás visualizar/descargar los Cuadros Hemáticos en PDF directamente." />
      <Rule n="⚠" t={`Si presentas fallas técnicas, escríbenos a ${REPORTE_EMAIL} para habilitar tu intento.`} />
    </div>
    <button onClick={beginTest} className="mt-6 w-full rounded-xl py-3.5 font-medium cursor-pointer" style={{ background: C.blue, color: "#fff", fontSize: 16 }}>Entendido, comenzar prueba</button>
  </div></Shell>;

  // ---- TEST SCREEN ----
  const low = remaining <= 180;
  return <Shell timer={<div className="rounded-full px-4 py-1.5 text-sm font-semibold sticky top-4 z-50 shadow-sm" style={{ background: low ? C.warnBg : C.soft, color: low ? C.warn : C.blueDk }}>⏱ {mmss(remaining)}</div>}>
    <div className="grid gap-6">
      
      {/* SECCIÓN A */}
      <Block card={card} title="Sección A · Cálculo de dosis" hint="Escribe el valor numérico a administrar (mL), salvo A2 (mL/h).">
        {CALC.map((c) => (
          <div key={c.id} className="mb-5">
            <p className="text-sm mb-2" style={{ color: C.ink }}><b>{c.id}.</b> {c.q}</p>
            <input value={calc[c.id] ?? ""} onChange={(e) => setCalc((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="Tu respuesta" inputMode="decimal" className="rounded-xl px-4 py-2.5 outline-none" style={{ border: `1px solid ${C.line}`, width: 180 }} />
          </div>
        ))}
      </Block>

      {/* SECCIÓN B */}
      <Block card={card} title="Sección B · Farmacología y control especial">
        {MCQ.map((m) => (
          <div key={m.id} className="mb-5">
            <p className="text-sm mb-2" style={{ color: C.ink }}><b>{m.id}.</b> {m.q}</p>
            <div className="grid gap-2">
              {m.opts.map((o, idx) => {
                const chosen = mcq[m.id] === idx;
                return <button key={idx} onClick={() => setMcq((s) => ({ ...s, [m.id]: idx }))} className="text-left rounded-xl px-4 py-2.5 text-sm transition-all cursor-pointer" style={{ border: `1.5px solid ${chosen ? C.blue : C.line}`, background: chosen ? C.soft : "#fff", color: C.ink }}>{o}</button>;
              })}
            </div>
          </div>
        ))}
      </Block>

      {/* SECCIÓN C: GESTIÓN DE TIEMPO, CONFLICTOS Y CALAMIDADES */}
      <Block card={card} title="Sección C · Gestión del tiempo, imprevistos y manejo de conflictos">
        {MCQ_MANAGEMENT.map((m) => (
          <div key={m.id} className="mb-5">
            <p className="text-sm mb-2" style={{ color: C.ink }}><b>{m.id}.</b> {m.q}</p>
            <div className="grid gap-2">
              {m.opts.map((o, idx) => {
                const chosen = mcqMgmt[m.id] === idx;
                return <button key={idx} onClick={() => setMcqMgmt((s) => ({ ...s, [m.id]: idx }))} className="text-left rounded-xl px-4 py-2.5 text-sm transition-all cursor-pointer" style={{ border: `1.5px solid ${chosen ? C.blue : C.line}`, background: chosen ? C.soft : "#fff", color: C.ink }}>{o}</button>;
              })}
            </div>
          </div>
        ))}
      </Block>

      {/* SECCIÓN D: CASOS CLÍNICOS REALES CON PDF */}
      <Block card={card} title="Sección D · Casos Clínicos Reales de la Clínica" hint="Analiza el historial, abre o visualiza el examen complementario (PDF) y redacta tu abordaje diagnóstico/terapéutico.">
        {CLINICAL_CASES.map((c) => (
          <div key={c.id} className="mb-8 p-5 rounded-2xl" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg" style={{ color: C.navy }}>Caso Paciente: {c.patient}</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: C.soft, color: C.blueDk }}>Caso Real</span>
            </div>
            
            <p className="text-xs font-medium mb-1" style={{ color: C.sub }}><b>Reseña:</b> {c.details}</p>
            <p className="text-sm mb-4" style={{ color: C.ink }}><b>Signos y Anamnesis:</b> {c.history}</p>
            
            {/* Visualizador de PDF integrador */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: C.faint }}>DOCUMENTO ADJUNTO (CUADRO HEMÁTICO):</span>
                <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline" style={{ color: C.blue }}>
                  Abrir PDF en pestaña nueva ↗
                </a>
              </div>
              <div className="w-full rounded-xl overflow-hidden border border-slate-200" style={{ height: "320px", background: "#E2E7F1" }}>
                <iframe src={`${c.pdfUrl}#toolbar=0`} title={`Cuadro Hemático ${c.patient}`} className="w-full h-full border-none" />
              </div>
            </div>

            <p className="text-sm font-semibold mb-2" style={{ color: C.navy }}>{c.prompt}</p>
            <textarea 
              value={cases[c.id] ?? ""} 
              onChange={(e) => setCases((s) => ({ ...s, [c.id]: e.target.value }))} 
              rows={5} 
              placeholder="Describe tu ruta diagnóstica, diferenciales y conducta médica..." 
              className="w-full rounded-xl p-3.5 outline-none resize-y bg-white text-sm" 
              style={{ border: `1px solid ${C.line}`, ...sans }} 
            />
          </div>
        ))}
      </Block>

      {/* SECCIÓN E: PREGUNTAS ABIERTAS */}
      <Block card={card} title="Sección E · Criterio Médico y Aspectos Personales" hint="Responde según tu protocolo de consulta externa, urgencias y manejo profesional.">
        {OPEN.map((q) => (
          <div key={q.id} className="mb-5">
            <p className="text-sm mb-2" style={{ color: C.ink }}><b>{q.id}.</b> {q.q}</p>
            <textarea value={open[q.id] ?? ""} onChange={(e) => setOpen((s) => ({ ...s, [q.id]: e.target.value }))} rows={4} className="w-full rounded-xl px-4 py-3 outline-none resize-y" style={{ border: `1px solid ${C.line}`, ...sans }} />
          </div>
        ))}
      </Block>

      {/* BOTÓN DE ENVIAR */}
      <div className="rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3" style={card}>
        <span className="text-sm" style={{ color: C.faint }}>{objDone ? "Secciones objetivas completas. ¡Listo para enviar!" : "Completa las opciones múltiples y cálculos para habilitar el envío."}</span>
        <button disabled={!objDone || sent === "sending"} onClick={() => finish(false)} className="rounded-xl px-6 py-3 font-medium cursor-pointer transition-all" style={{ background: objDone ? C.blue : C.line, color: objDone ? "#fff" : C.faint, cursor: objDone ? "pointer" : "not-allowed" }}>{sent === "sending" ? "Enviando prueba…" : "Enviar prueba técnica"}</button>
      </div>

    </div>
  </Shell>;
}

/* ---------- COMPONENTES REUTILIZABLES ---------- */
function Shell({ children, timer }) {
  return (
    <div className="min-h-screen w-full flex items-start justify-center py-10 px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
      <div className="w-full" style={{ maxWidth: 680 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
            <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.18em" }}>Prueba técnica · Médico Veterinario</span>
          </div>
          {timer}
        </div>
        {children}
        <p className="text-center text-xs mt-8" style={{ color: C.faint }}>Pet Station Vet — Proceso Interno de Selección</p>
      </div>
    </div>
  );
}

function Block({ title, hint, children, card }) {
  return (<div className="rounded-3xl p-7" style={card}>
    <h2 style={{ ...serif, fontSize: 22, fontWeight: 500, color: C.navy }}>{title}</h2>
    {hint ? <p className="mt-1 mb-5 text-sm" style={{ color: C.faint }}>{hint}</p> : <div className="mb-5" />}
    {children}
  </div>);
}

function Rule({ n, t }) {
  return (<div className="flex items-start gap-3">
    <span className="flex items-center justify-center rounded-lg font-medium" style={{ minWidth: 28, height: 28, background: C.soft, color: C.blue, fontSize: 14 }}>{n}</span>
    <span className="text-sm" style={{ color: C.ink, lineHeight: 1.5 }}>{t}</span>
  </div>);
}

function Center({ children }) { return <div className="rounded-3xl p-10 text-center" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.sub }}>{children}</div>; }

function Message({ title, body, foot }) {
  return (<div className="rounded-3xl p-10 text-center" style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" }}>
    <h1 style={{ ...serif, fontSize: 28, fontWeight: 500, color: C.navy }}>{title}</h1>
    <p className="mt-3" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>{body}</p>
    {foot && <p className="mt-4 text-xs" style={{ color: C.faint }}>{foot}</p>}
  </div>);
}