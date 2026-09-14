import React, { useState, useEffect, useRef } from "react";

/* ================== CONFIG ================== */
const REQUIRE_TOKEN = true;
const REPORTE_EMAIL = "community.manager@petstationvet.com";
/* ============================================ */

const C = { paper: "#F4F6FB", surface: "#FFFFFF", ink: "#14213D", sub: "#586182", faint: "#9AA6BE", navy: "#152C77", blue: "#2563EB", blueDk: "#1E3A8A", soft: "#E7EEFB", line: "#E2E7F1" };
const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };
const COMODIDAD = ["Baño y secado", "Corte por raza específica", "Deslanado", "Corte de uñas", "Limpieza de oídos", "Gatos", "Perros de talla grande", "Mascotas agresivas o temerosas"];

const qp = (k) => { try { return new URLSearchParams(window.location.search).get(k) || ""; } catch (e) { return ""; } };
const ls = (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) {} };
async function checkToken(token, tipo) {
  const r = await fetch(`/api/check?token=${encodeURIComponent(token)}&tipo=${encodeURIComponent(tipo)}`);
  return r.json();
}
function useFonts() {
  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(l); return () => document.head.removeChild(l);
  }, []);
}

export default function App() {
  useFonts();
  const isPreview = qp("preview") === "1";
  const [phase, setPhase] = useState(isPreview ? "form" : "loading"); // loading|invalid|already|form|done
  const [reason, setReason] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [f, setF] = useState({
    experienciaPrevia: "",
    aniosExp: "",
    certificaciones: "",
    comodoTurnos: "",
    ubicacion: "",
    salario: "",
    sustentoSalario: "",
    inicio: "",
    comodidad: []
  });
  const [sent, setSent] = useState("idle");
  const sentRef = useRef("idle");
  const doneKey = `done-inicial-peluqueria-${token || "test"}`;

  useEffect(() => {
    if (isPreview) return; // modo vista previa: no valida token ni llama al backend
    const tk = qp("token"); setToken(tk);
    if (ls(`done-inicial-peluqueria-${tk || "test"}`)) { setPhase("already"); return; }
    if (!REQUIRE_TOKEN) { setPhase("form"); return; }
    if (!tk) { setReason("sin_token"); setPhase("invalid"); return; }
    checkToken(tk, "inicial")
      .then((r) => { if (!r || !r.valid) { setReason(r ? r.reason : "error"); setPhase("invalid"); return; } setName(r.nombre || ""); setEmail(r.email || ""); setPhase("form"); })
      .catch(() => { setReason("error"); setPhase("invalid"); });
  }, []);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleCom = (c) => setF((s) => ({ ...s, comodidad: s.comodidad.includes(c) ? s.comodidad.filter((x) => x !== c) : [...s.comodidad, c] }));

  const complete = f.experienciaPrevia && f.aniosExp.trim() && f.comodoTurnos && f.ubicacion.trim() && f.salario.trim() && f.sustentoSalario.trim() && f.inicio.trim();

  async function submit() {
    if (sentRef.current !== "idle" || !complete) return;
    sentRef.current = "sending"; setSent("sending");
    const payload = {
      tipo: "inicial", token, fecha: new Date().toISOString(), nombre: name, email,
      experienciaPrevia: f.experienciaPrevia, aniosExp: f.aniosExp, certificaciones: f.certificaciones,
      comodoLunesSabado: f.comodoTurnos, ubicacion: f.ubicacion, salario: f.salario, sustentoSalario: f.sustentoSalario,
      inicio: f.inicio, comodidad: f.comodidad,
    };
    try { await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); } catch (e) {}
    lsSet(doneKey, "1"); sentRef.current = "ok"; setSent("ok"); setPhase("done");
  }

  const card = { background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)" };
  const input = { border: `1px solid ${C.line}`, ...sans };

  if (phase === "loading") return <Shell><Center>Cargando…</Center></Shell>;
  if (phase === "invalid") return <Shell><Message title="Enlace no válido"
    body={reason === "usada" ? "Este cuestionario ya fue completado con este enlace." : reason === "sin_token" ? "Necesitas el enlace personal que te enviamos por correo." : reason === "tipo_incorrecto" ? "Este enlace no corresponde a este cuestionario." : "No pudimos validar tu enlace."}
    foot={`Si crees que es un error, escríbenos a ${REPORTE_EMAIL}.`} /></Shell>;
  if (phase === "already") return <Shell><Message title="Cuestionario completado" body="Ya enviaste este cuestionario. ¡Gracias!" /></Shell>;
  if (phase === "done") return <Shell><div className="rounded-3xl p-10 text-center" style={card}>
    <div className="mx-auto rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: C.soft }}><span style={{ color: C.blue, fontSize: 28 }}>✓</span></div>
    <h1 className="mt-5" style={{ ...serif, fontSize: 30, fontWeight: 500, color: C.navy }}>¡Gracias, {name || "por postularte"}!</h1>
    <p className="mt-3" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>Recibimos tu postulación. Revisaremos tus respuestas y te contactaremos con los siguientes pasos del proceso.</p>
  </div></Shell>;

  const disabledStyle = isPreview ? { opacity: 0.55, pointerEvents: "none" } : {};

  return <Shell>
    {isPreview && (
      <div className="rounded-2xl px-5 py-4 mb-6 flex items-center gap-3" style={{ background: "#FEF0E7", border: "1px solid #B54708" }}>
        <span style={{ fontSize: 18 }}>👀</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#B54708" }}>Modo vista previa — solo para revisión</p>
          <p className="text-xs mt-0.5" style={{ color: "#B54708" }}>Nadie puede responder ni enviar nada desde este enlace. Es únicamente para aprobar el contenido de las preguntas.</p>
        </div>
      </div>
    )}
    <div className="rounded-3xl p-8" style={card}>
      <h1 style={{ ...serif, fontSize: 32, lineHeight: 1.1, fontWeight: 500, color: C.navy }}>Cuestionario de postulación</h1>
      <p className="mt-3 mb-6" style={{ color: C.sub, fontSize: 16, lineHeight: 1.6 }}>{name ? `¡Hola, ${name}! ` : ""}Toma 2 minutos. Con esto iniciamos tu proceso.</p>

      <div style={disabledStyle}>
        <Q label="¿Tienes experiencia previa en peluquería canina y/o felina?">
          <Choice value={f.experienciaPrevia} options={["Sí", "No"]} onPick={(v) => set("experienciaPrevia", v)} />
        </Q>
        <Q label="¿Cuántos años de experiencia tienes en grooming de mascotas?">
          <input value={f.aniosExp} onChange={(e) => set("aniosExp", e.target.value)} placeholder="Ej: 3" inputMode="decimal" className="rounded-xl px-4 py-2.5 outline-none" style={{ ...input, width: 160 }} />
        </Q>
        <Q label="¿Tienes algún curso o certificación en peluquería/grooming? (opcional)">
          <input value={f.certificaciones} onChange={(e) => set("certificaciones", e.target.value)} placeholder="Ej: Curso de grooming canino, 2023" className="w-full rounded-xl px-4 py-2.5 outline-none" style={input} />
        </Q>
        <Q label="¿Tienes disponibilidad para trabajar de lunes a sábado, cumpliendo el horario o turno que te asignen?">
          <Choice value={f.comodoTurnos} options={["Sí", "No"]} onPick={(v) => set("comodoTurnos", v)} />
        </Q>
        <Q label="¿Desde dónde te desplazarías? (ciudad o barrio)">
          <input value={f.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} placeholder="Ej: Chía, Cajicá…" className="w-full rounded-xl px-4 py-2.5 outline-none" style={input} />
        </Q>
        <Q label="¿Cuál es tu expectativa salarial?">
          <input value={f.salario} onChange={(e) => set("salario", e.target.value)} placeholder="Ej: $2.000.000" className="w-full rounded-xl px-4 py-2.5 outline-none" style={input} />
        </Q>
        <Q label="¿En qué basas tu expectativa salarial? (experiencia, competencias clave o valor que le aportarás)">
          <textarea
            value={f.sustentoSalario}
            onChange={(e) => set("sustentoSalario", e.target.value)}
            placeholder="Cuéntanos brevemente sobre tus habilidades, logros o experiencia que respaldan tu aspiración salarial..."
            rows={3}
            className="w-full rounded-xl px-4 py-2.5 outline-none resize-none"
            style={input}
          />
        </Q>
        <Q label="¿En cuánto tiempo podrías empezar?">
          <input value={f.inicio} onChange={(e) => set("inicio", e.target.value)} placeholder="Ej: Inmediato / 15 días" className="w-full rounded-xl px-4 py-2.5 outline-none" style={input} />
        </Q>
        <Q label="¿Con qué te sientes cómodo/a? (elige las que apliquen)" last>
          <div className="flex flex-wrap gap-2">
            {COMODIDAD.map((c) => {
              const on = f.comodidad.includes(c);
              return <button key={c} onClick={() => toggleCom(c)} className="rounded-full px-4 py-2 text-sm transition-all" style={{ border: `1.5px solid ${on ? C.blue : C.line}`, background: on ? C.soft : "#fff", color: on ? C.blueDk : C.sub, fontWeight: on ? 600 : 400 }}>{c}</button>;
            })}
          </div>
        </Q>
      </div>

      {isPreview ? (
        <p className="mt-2 text-sm text-center" style={{ color: C.faint }}>Vista previa de solo lectura — el envío está deshabilitado.</p>
      ) : (
        <>
          <button disabled={!complete || sent === "sending"} onClick={submit} className="mt-2 w-full rounded-xl py-3.5 font-medium" style={{ background: complete ? C.blue : C.line, color: complete ? "#fff" : C.faint, fontSize: 16, cursor: complete ? "pointer" : "not-allowed" }}>
            {sent === "sending" ? "Enviando…" : "Enviar postulación"}
          </button>
          {!complete && <p className="mt-3 text-xs text-center" style={{ color: C.faint }}>Completa todas las preguntas para enviar.</p>}
        </>
      )}
    </div>
  </Shell>;
}

function Shell({ children }) {
  return (<div className="min-h-screen w-full flex items-start justify-center py-10 px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
    <div className="w-full" style={{ maxWidth: 600 }}>
      <div className="flex items-center gap-2 mb-6">
        <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
        <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.18em" }}>Postulación · Peluquero(a) Canino/Felino</span>
      </div>
      {children}
      <p className="text-center text-xs mt-8" style={{ color: C.faint }}>Uso interno de selección</p>
    </div>
  </div>);
}
function Q({ label, children, last }) {
  return (<div style={{ marginBottom: last ? 24 : 22 }}>
    <p className="text-sm mb-2" style={{ color: C.ink, fontWeight: 500 }}>{label}</p>
    {children}
  </div>);
}
function Choice({ value, options, onPick }) {
  return (<div className="flex gap-2">
    {options.map((o) => {
      const on = value === o;
      return <button key={o} onClick={() => onPick(o)} className="rounded-xl px-6 py-2.5 text-sm transition-all" style={{ border: `1.5px solid ${on ? C.blue : C.line}`, background: on ? C.soft : "#fff", color: on ? C.blueDk : C.sub, fontWeight: on ? 600 : 400 }}>{o}</button>;
    })}
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
