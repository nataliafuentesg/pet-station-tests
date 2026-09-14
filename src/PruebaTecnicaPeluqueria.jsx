import React, { useState, useEffect, useMemo, useRef } from "react";

/* ================== CONFIG ================== */
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwtDmt31qfJITUxgBriD4QwxJ9vcDN7GL0MvqglRcZIGYUwraLgsNUMxRfYhzzO8ua9/exec";
const REQUIRE_TOKEN = true;
const DURACION_SEG = 35 * 60; // 35 minutos
const REPORTE_EMAIL = "community.manager@petstationvet.com";
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

// SECCIÓN A: CÁLCULOS Y ORGANIZACIÓN PRÁCTICA
const CALC = [
    { id: "A1", q: "Necesitas preparar 500 mL de shampoo diluido en proporción 1:8 (1 parte de shampoo concentrado por 8 partes de agua). ¿Cuántos mL de shampoo concentrado usas? (aproxima a 1 decimal)", ans: 55.6, tol: 1 },
    { id: "A2", q: "Tienes un turno de 4 horas (240 min). Ya programaste 3 perros de talla grande que toman 45 min cada uno. Si los perros de talla pequeña toman 25 min cada uno, ¿cuántos perros pequeños completos más te alcanzan a caber en el tiempo restante?", ans: 4, tol: 0 },
    { id: "A3", q: "Un frasco de shampoo concentrado de 1 L se diluye en proporción 1:8 (1 parte de shampoo por 8 de agua). ¿Cuántos litros de shampoo listo para usar obtienes con el frasco completo?", ans: 9, tol: 0.3 },
];

// SECCIÓN B: HIGIENE, BIOSEGURIDAD Y MANEJO DE EQUIPO
const MCQ_HIGIENE = [
    { id: "B1", q: "¿Cuándo debes desinfectar tijeras y máquinas de corte?", opts: ["Solo al final del día", "Entre cada mascota", "Una vez a la semana", "Solo si se ven sucias"], correct: 1 },
    { id: "B2", q: "Antes de recibir a una mascota para el servicio, ¿qué debes verificar?", opts: ["Solo el peso", "Que las vacunas y desparasitación estén al día y no haya signos de enfermedad", "Nada, eso se revisa después", "Solo el color del pelaje"], correct: 1 },
    { id: "B3", q: "¿Cómo debes usar la máquina de corte cerca de zonas sensibles (orejas, genitales, pliegues)?", opts: ["A máxima velocidad para terminar rápido", "Con precaución, cuchilla adecuada y sosteniendo firme pero suave la piel", "No es necesario tener cuidado especial ahí", "Solo con tijeras, nunca con máquina"], correct: 1 },
    { id: "B4", q: "Si te cortas o lastimas accidentalmente a una mascota durante el servicio, ¿qué haces primero?", opts: ["Terminas el servicio y avisas al final", "Detienes el servicio, atiendes la herida y avisas de inmediato al dueño y a tu líder", "No dices nada si es una herida pequeña", "Sigues cortando en otra zona para no perder tiempo"], correct: 1 },
];

// SECCIÓN C: COMPORTAMIENTO ANIMAL Y MANEJO DE SITUACIONES DIFÍCILES
const MCQ_COMPORTAMIENTO = [
    { id: "C1", q: "Un perro empieza a gruñir y mostrar los dientes mientras lo estás secando. ¿Qué haces?", opts: ["Continúas rápido para terminar antes de que reaccione peor", "Te detienes, evalúas la causa (miedo, dolor, cansancio) y ajustas o pausas el servicio", "Lo regañas para que entienda quién manda", "Lo sostienes con más fuerza para controlarlo"], correct: 1 },
    { id: "C2", q: "Un gato se pone muy estresado y empieza a intentar escapar de la mesa. ¿Cuál es la conducta más segura?", opts: ["Sujetarlo fuerte de las patas para inmovilizarlo por completo", "Usar una técnica de sujeción segura, dar pausas cortas y evaluar si se debe suspender el servicio", "Dejarlo suelto para que se calme solo en la sala", "Amarrarlo con la correa a la mesa y seguir sin supervisión"], correct: 1 },
    { id: "C3", q: "Durante el baño notas una masa, una herida o una zona muy inflamada que no sabías que tenía la mascota. ¿Qué haces?", opts: ["Sigues el servicio normal sin decir nada", "Evitas esa zona si es necesario, documentas el hallazgo y se lo informas al dueño y/o remites a valoración veterinaria", "Le aplicas tú algún tratamiento", "Rasuras esa zona para verla mejor sin avisar"], correct: 1 },
    { id: "C4", q: "Detectas pulgas o garrapatas visibles en la mascota. ¿Cómo procedes?", opts: ["Continúas el servicio y no dices nada para no incomodar al cliente", "Informas al dueño, sigues el protocolo de desinfección de área/equipo y documentas el hallazgo", "Le devuelves la mascota sin bañarla ni decir nada", "Usas los mismos utensilios sin desinfectar para el siguiente paciente"], correct: 1 },
];

// SECCIÓN D: CASOS REALES DE LA CLÍNICA
const CASES = [
    {
        id: "CASE_SIMONA",
        patient: "Simona",
        details: "Golden Retriever / 4 años / pelo largo, la llevan cada 3-4 meses aproximadamente.",
        history: "Llega con el pelaje muy enredado, con varias matas compactas cerca de la piel en orejas, axilas y cola. El dueño pide que 'quede como siempre, sin cortarle mucho pelo'.",
        prompt: "Describe cómo evaluarías el estado del pelaje, qué opciones le explicarías al dueño (desenredar vs. rasurar) y qué harías si al intentar desenredar notas que le genera dolor o la piel está irritada debajo de una mata."
    },
    {
        id: "CASE_MICHI",
        patient: "Michi",
        details: "Gato Persa / 6 años / primera vez en peluquería, según el dueño 'es muy nervioso'.",
        history: "Al ponerlo en la mesa se pone muy tenso, maúlla fuerte e intenta escapar apenas siente la máquina encendida cerca. Tiene nudos moderados en el lomo y las patas traseras.",
        prompt: "Describe tu abordaje paso a paso: cómo intentarías tranquilizarlo, en qué momento decidirías pausar o suspender el servicio, y cómo se lo comunicarías al dueño si no logras completar el corte de forma segura."
    }
];

// SECCIÓN E: SERVICIO AL CLIENTE E IMPREVISTOS
const OPEN = [
    { id: "E1", q: "Un cliente llega a recoger a su mascota y no está conforme con el corte porque 'no quedó como en la foto que mostró'. ¿Cómo manejas la situación?" },
    { id: "E2", q: "Notas que una mascota tiene parásitos visibles (pulgas/garrapatas) apenas la recibes. ¿Cómo se lo comunicas al dueño y qué haces antes de empezar el servicio?" },
    { id: "E3", q: "¿Cómo llevarías el control de insumos y del estado de las máquinas/tijeras para asegurar que siempre estén listas y en buen estado?" },
    { id: "E4", q: "Si estás en medio de una jornada con varias citas seguidas y atraviesas un imprevisto personal grave (una emergencia familiar), ¿cómo lo manejas frente a tus citas pendientes y el equipo?" },
];

const OBJ_TOTAL = CALC.length + MCQ_HIGIENE.length + MCQ_COMPORTAMIENTO.length;

/* ---- helpers ---- */
const qp = (k) => { try { return new URLSearchParams(window.location.search).get(k) || ""; } catch (e) { return ""; } };
const ls = (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { } };
function jsonp(url) {
    return new Promise((res, rej) => {
        const cb = "cb_" + Math.random().toString(36).slice(2);
        const s = document.createElement("script");
        window[cb] = (d) => { res(d); try { delete window[cb]; } catch (e) { } s.remove(); };
        s.onerror = () => { rej(new Error("net")); s.remove(); };
        s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
        document.body.appendChild(s);
        setTimeout(() => { if (window[cb]) { try { delete window[cb]; } catch (e) { } s.remove(); rej(new Error("timeout")); } }, 20000);
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
    const [higiene, setHigiene] = useState({});
    const [comportamiento, setComportamiento] = useState({});
    const [cases, setCases] = useState({});
    const [open, setOpen] = useState({});

    const [start, setStart] = useState(null);
    const [remaining, setRemaining] = useState(DURACION_SEG);
    const [sent, setSent] = useState("idle");
    const sentRef = useRef("idle");

    const startKey = `start-tecnica-peluqueria-${token || "test"}`;
    const doneKey = `done-tecnica-peluqueria-${token || "test"}`;

    const score = useMemo(() => {
        let s = 0; const dc = {}, dh = {}, dco = {};
        CALC.forEach((c) => { const v = parseFloat(String(calc[c.id]).replace(",", ".")); const ok = !isNaN(v) && Math.abs(v - c.ans) <= c.tol; dc[c.id] = ok; if (ok) s++; });
        MCQ_HIGIENE.forEach((m) => { const ok = higiene[m.id] === m.correct; dh[m.id] = ok; if (ok) s++; });
        MCQ_COMPORTAMIENTO.forEach((m) => { const ok = comportamiento[m.id] === m.correct; dco[m.id] = ok; if (ok) s++; });
        return { s, dc, dh, dco };
    }, [calc, higiene, comportamiento]);

    // ---- mount: token / attempt / resume ----
    useEffect(() => {
        const tk = qp("token"); setToken(tk);
        const dk = `done-tecnica-peluqueria-${tk || "test"}`;
        if (ls(dk)) { setPhase("already"); return; }
        if (!REQUIRE_TOKEN) { setPhase("intro"); return; }
        if (!tk) { setReason("sin_token"); setPhase("invalid"); return; }
        jsonp(`${WEBAPP_URL}?action=check&token=${encodeURIComponent(tk)}&tipo=tecnica`)
            .then((r) => {
                if (!r || !r.valid) { setReason(r ? r.reason : "error"); setPhase("invalid"); return; }
                setName(r.nombre || ""); setEmail(r.email || "");
                const st = ls(`start-tecnica-peluqueria-${tk}`);
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
            tipo: "tecnica", token, fecha: new Date().toISOString(), nombre: name, email,
            puntaje: score.s, total: OBJ_TOTAL,
            detalleCalc: score.dc,
            detalleHigiene: score.dh,
            detalleComportamiento: score.dco,
            casos: CASES.reduce((o, c) => { o[c.id] = cases[c.id] || ""; return o; }, {}),
            abiertas: OPEN.reduce((o, q) => { o[q.id] = open[q.id] || ""; return o; }, {}),
            tiempoSeg: tiempo, autoenviado: !!auto,
        };
        try { await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }); } catch (e) { }
        lsSet(doneKey, "1"); sentRef.current = "ok"; setSent("ok"); setPhase("done");
    }

    const objDone = CALC.every((c) => calc[c.id] !== undefined && calc[c.id] !== "") &&
        MCQ_HIGIENE.every((m) => higiene[m.id] !== undefined) &&
        MCQ_COMPORTAMIENTO.every((m) => comportamiento[m.id] !== undefined);

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
        <p className="mt-3" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Recibimos tu prueba. Nuestro equipo la revisará detalladamente y te contactaremos para los siguientes pasos.</p>
    </div></Shell>;

    if (phase === "intro") return <Shell><div className="rounded-3xl p-8" style={card}>
        <h1 style={{ ...serif, fontSize: 34, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>Prueba técnica<br />Peluquero(a) Canino/Felino</h1>
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
            <Rule n="📋" t="Evaluamos: cálculos y organización práctica, higiene y manejo de equipo, comportamiento animal, casos reales y servicio al cliente." />
            <Rule n="⚠" t={`Si presentas fallas técnicas, escríbenos a ${REPORTE_EMAIL} para habilitar tu intento.`} />
        </div>
        <button onClick={beginTest} className="mt-6 w-full rounded-xl py-3.5 font-medium cursor-pointer" style={{ background: C.blue, color: "#fff", fontSize: 16 }}>Entendido, comenzar prueba</button>
    </div></Shell>;

    // ---- TEST SCREEN ----
    const low = remaining <= 180;
    return <Shell timer={<div className="rounded-full px-4 py-1.5 text-sm font-semibold sticky top-4 z-50 shadow-sm" style={{ background: low ? C.warnBg : C.soft, color: low ? C.warn : C.blueDk }}>⏱ {mmss(remaining)}</div>}>
        <div className="grid gap-6">

            {/* SECCIÓN A */}
            <Block card={card} title="Sección A · Cálculos y organización práctica" hint="Escribe el valor numérico solicitado.">
                {CALC.map((c) => (
                    <div key={c.id} className="mb-5">
                        <p className="text-sm mb-2" style={{ color: C.ink }}><b>{c.id}.</b> {c.q}</p>
                        <input value={calc[c.id] ?? ""} onChange={(e) => setCalc((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="Tu respuesta" inputMode="decimal" className="rounded-xl px-4 py-2.5 outline-none" style={{ border: `1px solid ${C.line}`, width: 180 }} />
                    </div>
                ))}
            </Block>

            {/* SECCIÓN B */}
            <Block card={card} title="Sección B · Higiene, bioseguridad y manejo de equipo">
                {MCQ_HIGIENE.map((m) => (
                    <div key={m.id} className="mb-5">
                        <p className="text-sm mb-2" style={{ color: C.ink }}><b>{m.id}.</b> {m.q}</p>
                        <div className="grid gap-2">
                            {m.opts.map((o, idx) => {
                                const chosen = higiene[m.id] === idx;
                                return <button key={idx} onClick={() => setHigiene((s) => ({ ...s, [m.id]: idx }))} className="text-left rounded-xl px-4 py-2.5 text-sm transition-all cursor-pointer" style={{ border: `1.5px solid ${chosen ? C.blue : C.line}`, background: chosen ? C.soft : "#fff", color: C.ink }}>{o}</button>;
                            })}
                        </div>
                    </div>
                ))}
            </Block>

            {/* SECCIÓN C */}
            <Block card={card} title="Sección C · Comportamiento animal y situaciones difíciles">
                {MCQ_COMPORTAMIENTO.map((m) => (
                    <div key={m.id} className="mb-5">
                        <p className="text-sm mb-2" style={{ color: C.ink }}><b>{m.id}.</b> {m.q}</p>
                        <div className="grid gap-2">
                            {m.opts.map((o, idx) => {
                                const chosen = comportamiento[m.id] === idx;
                                return <button key={idx} onClick={() => setComportamiento((s) => ({ ...s, [m.id]: idx }))} className="text-left rounded-xl px-4 py-2.5 text-sm transition-all cursor-pointer" style={{ border: `1.5px solid ${chosen ? C.blue : C.line}`, background: chosen ? C.soft : "#fff", color: C.ink }}>{o}</button>;
                            })}
                        </div>
                    </div>
                ))}
            </Block>

            {/* SECCIÓN D */}
            <Block card={card} title="Sección D · Casos reales" hint="Lee el historial de la mascota y describe tu abordaje.">
                {CASES.map((c) => (
                    <div key={c.id} className="mb-8 p-5 rounded-2xl" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg" style={{ color: C.navy }}>Caso: {c.patient}</h3>
                            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: C.soft, color: C.blueDk }}>Caso real</span>
                        </div>
                        <p className="text-xs font-medium mb-1" style={{ color: C.sub }}><b>Reseña:</b> {c.details}</p>
                        <p className="text-sm mb-4" style={{ color: C.ink }}><b>Situación:</b> {c.history}</p>
                        <p className="text-sm font-semibold mb-2" style={{ color: C.navy }}>{c.prompt}</p>
                        <textarea
                            value={cases[c.id] ?? ""}
                            onChange={(e) => setCases((s) => ({ ...s, [c.id]: e.target.value }))}
                            rows={5}
                            placeholder="Describe tu abordaje..."
                            className="w-full rounded-xl p-3.5 outline-none resize-y bg-white text-sm"
                            style={{ border: `1px solid ${C.line}`, ...sans }}
                        />
                    </div>
                ))}
            </Block>

            {/* SECCIÓN E */}
            <Block card={card} title="Sección E · Servicio al cliente e imprevistos">
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
                        <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.18em" }}>Prueba técnica · Peluquero(a) Canino/Felino</span>
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
