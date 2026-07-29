import React, { useState, useEffect, useMemo, useRef } from "react";

/* ================== CONFIG ================== */
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwtDmt31qfJITUxgBriD4QwxJ9vcDN7GL0MvqglRcZIGYUwraLgsNUMxRfYhzzO8ua9/exec";
const REQUIRE_TOKEN = true;   // false = modo prueba libre (sin token)
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
  soft: "#E7EEFB", 
  line: "#E2E7F1" 
};

const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

const SECTIONS = [
  { id: "cognitivo", title: "Cómo piensas y decides", left: "Análisis y método", right: "Agilidad y espontaneidad",
    items: [{ left: "Analítico(a)", right: "Rápido(a)" }, { left: "Metódico(a)", right: "Espontáneo(a)" }, { left: "Deliberado(a)", right: "Impulsivo(a)" }] },
  { id: "orden", title: "Orden y ejecución", left: "Orden y precisión", right: "Flexibilidad y practicidad",
    items: [{ left: "Organizado(a)", right: "Flexible" }, { left: "Preciso(a)", right: "Práctico(a)" }, { left: "Sigo procesos", right: "Improviso" }] },
  { id: "personas", title: "Relación con los demás", left: "Orientación a las personas", right: "Foco en la tarea",
    items: [{ left: "Orientado(a) al cliente", right: "Orientado(a) a la tarea" }, { left: "Empático(a)", right: "Objetivo(a)" }, { left: "Colaborador(a)", right: "Autónomo(a)" }] },
  { id: "presion", title: "Bajo presión", left: "Calma y estabilidad", right: "Intensidad y reactividad",
    items: [{ left: "Tranquilo(a) bajo presión", right: "Me acelero" }, { left: "Constante", right: "Cambiante" }, { left: "Resiliente al estrés", right: "Sensible al estrés" }] },
  { id: "iniciativa", title: "Iniciativa", left: "Iniciativa y proactividad", right: "Ejecución guiada",
    items: [{ left: "Proactivo(a)", right: "Espero indicaciones" }, { left: "Propongo mejoras", right: "Sigo lo establecido" }, { left: "Decido con autonomía", right: "Consulto primero" }] },
];
const TOTAL = SECTIONS.reduce((n, s) => n + s.items.length, 0);

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

function lean(mean, s) {
  const d = mean - 4;
  if (Math.abs(d) < 0.7) return `equilibrio entre ${s.left.toLowerCase()} y ${s.right.toLowerCase()}`;
  const strong = Math.abs(d) >= 1.6;
  return (strong ? "marcada " : "") + (d < 0 ? s.left.toLowerCase() : s.right.toLowerCase());
}

function useFonts() {
  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(l); return () => document.head.removeChild(l);
  }, []);
}

export default function App() {
  useFonts();
  const [phase, setPhase] = useState("loading");
  const [reason, setReason] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState(""); 
  const [email, setEmail] = useState("");
  const [si, setSi] = useState(0);
  const [ans, setAns] = useState({});
  const [start, setStart] = useState(null);
  const [sent, setSent] = useState("idle");
  const sentRef = useRef("idle");
  const answered = Object.keys(ans).length;
  const doneKey = `done-estilo-${token || "test"}`;

  const results = useMemo(() => SECTIONS.map((s) => {
    const v = s.items.map((_, i) => ans[`${s.id}-${i}`]).filter(Boolean);
    const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 4;
    return { id: s.id, mean, tendencia: lean(mean, s) };
  }), [ans]);

  const summary = useMemo(() => "Se inclina hacia " + results.map((r) => r.tendencia).join(", ") + ".", [results]);

  useEffect(() => {
    const tk = qp("token"); setToken(tk);
    if (ls(`done-estilo-${tk || "test"}`)) { setPhase("already"); return; }
    if (!REQUIRE_TOKEN) { setPhase("intro"); return; }
    if (!tk) { setReason("sin_token"); setPhase("invalid"); return; }
    jsonp(`${WEBAPP_URL}?action=check&token=${encodeURIComponent(tk)}&tipo=estilo`)
      .then((r) => { 
        if (!r || !r.valid) { setReason(r ? r.reason : "error"); setPhase("invalid"); return; } 
        setName(r.nombre || ""); setEmail(r.email || ""); setPhase("instructions"); 
      })
      .catch(() => { setReason("error"); setPhase("invalid"); });
  }, []);

  function begin() { setStart(Date.now()); setPhase("quiz"); }

  async function finish() {
    if (sentRef.current !== "idle") return;
    sentRef.current = "sending"; setSent("sending");
    const tiempo = start ? Math.round((Date.now() - start) / 1000) : null;
    const payload = {
      tipo: "perfil", token, fecha: new Date().toISOString(), nombre: name, email,
      dimensiones: results.reduce((o, r) => { o[r.id] = { media: +r.mean.toFixed(2), tendencia: r.tendencia }; return o; }, {}),
      resumen: summary, respuestas: ans, tiempoSeg: tiempo,
    };
    try { 
      await fetch(WEBAPP_URL, { 
        method: "POST", 
        mode: "no-cors", 
        headers: { "Content-Type": "text/plain;charset=utf-8" }, 
        body: JSON.stringify(payload) 
      }); 
    } catch (e) {}
    lsSet(doneKey, "1"); sentRef.current = "ok"; setSent("ok"); setPhase("done");
  }

  const card = { background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" };
  const input = { border: `1px solid ${C.line}`, ...sans };

  if (phase === "loading") return <Shell><Center>Cargando…</Center></Shell>;
  if (phase === "invalid") return <Shell><Message title="Enlace no válido"
    body={reason === "usada" ? "Esta evaluación ya fue completada con este enlace." : reason === "sin_token" ? "Necesitas el enlace personal que te enviamos por correo." : reason === "tipo_incorrecto" ? "Este enlace no corresponde a esta evaluación." : "No pudimos validar tu enlace."}
    foot={`Si crees que es un error, escríbenos a ${REPORTE_EMAIL}.`} /></Shell>;
  if (phase === "already") return <Shell><Message title="Evaluación completada" body="Ya enviaste esta evaluación. ¡Gracias!" /></Shell>;
  if (phase === "done") return <Shell><div className="rounded-3xl p-8 sm:p-10 text-center" style={card}>
    <div className="mx-auto rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: C.soft }}><span style={{ color: C.blue, fontSize: 28 }}>✓</span></div>
    <h1 className="mt-5" style={{ ...serif, fontSize: 30, fontWeight: 500, color: C.navy }}>¡Gracias, {name || "por participar"}!</h1>
    <p className="mt-3" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Recibimos tus respuestas. Seguimos con los siguientes pasos del proceso y te contactaremos pronto.</p>
  </div></Shell>;

  if (phase === "intro") return <Shell><div className="rounded-3xl p-6 sm:p-8" style={card}>
    <h1 style={{ ...serif, fontSize: 32, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>Evaluación de<br />estilo de trabajo</h1>
    <p className="mt-4" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Modo prueba libre. Ingresa tus datos para comenzar.</p>
    <div className="mt-6 grid gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="w-full rounded-xl px-4 py-3 outline-none" style={input} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo" className="w-full rounded-xl px-4 py-3 outline-none" style={input} />
    </div>
    <button onClick={() => setPhase("instructions")} className="mt-6 w-full rounded-xl py-3.5 font-medium cursor-pointer" style={{ background: C.blue, color: "#fff", fontSize: 16 }}>Continuar</button>
  </div></Shell>;

  if (phase === "instructions") return <Shell><div className="rounded-3xl p-6 sm:p-8" style={card}>
    <h1 style={{ ...serif, fontSize: 30, lineHeight: 1.2, fontWeight: 500, color: C.navy }}>¿Cómo trabajas cuando estás en tu elemento?</h1>
    <p className="mt-4" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Son 15 preguntas. En cada una te ubicas entre dos formas de ser, según cuál te describe mejor en el día a día.</p>
    <div className="mt-5 grid gap-3">
      <Rule n="✓" t="No hay respuestas correctas ni incorrectas. Responde con sinceridad." />
      <Rule n="①" t="Es un solo intento. Tómate el tiempo que necesites, sin prisa." />
      <Rule n="⚠" t={`Si tienes un problema técnico, no reinicies: escríbenos a ${REPORTE_EMAIL}.`} />
    </div>
    <button onClick={begin} className="mt-6 w-full rounded-xl py-3.5 font-medium cursor-pointer" style={{ background: C.blue, color: "#fff", fontSize: 16 }}>Comenzar</button>
  </div></Shell>;

  // ---- quiz ----
  const sec = SECTIONS[si];
  const secDone = sec.items.every((_, i) => ans[`${sec.id}-${i}`]);

  return <Shell>
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: C.sub }}>Sección {si + 1} de {SECTIONS.length}</span>
        <span className="text-sm font-medium" style={{ color: C.faint }}>{answered}/{TOTAL}</span>
      </div>
      <div className="w-full rounded-full" style={{ height: 6, background: C.line }}>
        <div className="rounded-full transition-all duration-300" style={{ height: 6, width: `${(answered / TOTAL) * 100}%`, background: C.blue }} />
      </div>
    </div>

    <div className="rounded-3xl p-5 sm:p-7" style={card}>
      <h2 style={{ ...serif, fontSize: 26, fontWeight: 500, color: C.navy }}>{sec.title}</h2>
      <p className="mt-1 mb-6 text-sm" style={{ color: C.sub }}>
        Selecciona la opción que más se acerca a tu forma habitual de trabajar:
      </p>

      <div className="grid gap-6">
        {sec.items.map((it, i) => {
          const v = ans[`${sec.id}-${i}`];
          return (
            <div key={i} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex flex-col gap-3">
              
              {/* Etiquetas descriptivas de los dos extremos */}
              <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                <span className={`flex-1 text-left font-medium transition-colors ${v && v <= 3 ? "text-blue-700 font-semibold" : "text-slate-600"}`}>
                  ← {it.left}
                </span>
                <span className="text-slate-400 text-[11px] uppercase tracking-wider px-1 hidden sm:inline">vs</span>
                <span className={`flex-1 text-right font-medium transition-colors ${v && v >= 5 ? "text-blue-700 font-semibold" : "text-slate-600"}`}>
                  {it.right} →
                </span>
              </div>

              {/* Botones de calificación interactivos (Grandes para pantallas táctiles) */}
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                  const active = v === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAns((a) => ({ ...a, [`${sec.id}-${i}`]: n }))}
                      className={`flex-1 h-11 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600"
                          : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              {/* Pequeña guía inferior para orientar al candidato sobre la neutralidad */}
              <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                <span>Totalmente {it.left.toLowerCase()}</span>
                <span className="hidden sm:inline">Neutro (4)</span>
                <span>Totalmente {it.right.toLowerCase()}</span>
              </div>

            </div>
          );
        })}
      </div>
    </div>

    <div className="flex items-center justify-between mt-6">
      <button 
        onClick={() => setSi((x) => Math.max(0, x - 1))} 
        disabled={si === 0} 
        className="rounded-xl px-5 py-3 text-sm font-medium transition-all" 
        style={{ color: si === 0 ? C.faint : C.sub, border: `1px solid ${C.line}`, background: "#fff", cursor: si === 0 ? "default" : "pointer" }}
      >
        Atrás
      </button>

      {si < SECTIONS.length - 1 ? (
        <button 
          disabled={!secDone} 
          onClick={() => setSi((x) => x + 1)} 
          className="rounded-xl px-6 py-3 text-sm font-medium transition-all cursor-pointer" 
          style={{ background: secDone ? C.blue : C.line, color: secDone ? "#fff" : C.faint, cursor: secDone ? "pointer" : "not-allowed" }}
        >
          Siguiente
        </button>
      ) : (
        <button 
          disabled={answered < TOTAL || sent === "sending"} 
          onClick={finish} 
          className="rounded-xl px-6 py-3 text-sm font-medium transition-all cursor-pointer" 
          style={{ background: answered >= TOTAL ? C.blue : C.line, color: answered >= TOTAL ? "#fff" : C.faint, cursor: answered >= TOTAL ? "pointer" : "not-allowed" }}
        >
          {sent === "sending" ? "Enviando…" : "Finalizar y enviar"}
        </button>
      )}
    </div>
  </Shell>;
}

function Shell({ children }) {
  return (<div className="min-h-screen w-full flex items-start justify-center py-6 sm:py-10 px-3 sm:px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
    <div className="w-full" style={{ maxWidth: 620 }}>
      <div className="flex items-center gap-2 mb-6">
        <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
        <span className="text-xs uppercase font-semibold tracking-wider" style={{ color: C.faint }}>Evaluación de estilo de trabajo</span>
      </div>
      {children}
      <p className="text-center text-xs mt-8" style={{ color: C.faint }}>Autoevaluación de referencia · uso interno de selección</p>
    </div>
  </div>);
}

function Rule({ n, t }) {
  return (<div className="flex items-start gap-3">
    <span className="flex items-center justify-center rounded-lg font-semibold shrink-0" style={{ width: 28, height: 28, background: C.soft, color: C.blue, fontSize: 14 }}>{n}</span>
    <span className="text-sm" style={{ color: C.ink, lineHeight: 1.5 }}>{t}</span>
  </div>);
}

function Center({ children }) { return <div className="rounded-3xl p-10 text-center" style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.sub }}>{children}</div>; }

function Message({ title, body, foot }) {
  return (<div className="rounded-3xl p-8 sm:p-10 text-center" style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" }}>
    <h1 style={{ ...serif, fontSize: 28, fontWeight: 500, color: C.navy }}>{title}</h1>
    <p className="mt-3" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>{body}</p>
    {foot && <p className="mt-4 text-xs" style={{ color: C.faint }}>{foot}</p>}
  </div>);
}