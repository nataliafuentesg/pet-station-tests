import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import EvaluacionEstilo from "./EvaluacionEstilo";
import PruebaTecnica from "./PruebaTecnica";

const C = {
  paper: "#F4F6FB", surface: "#FFFFFF", ink: "#14213D", sub: "#586182",
  faint: "#9AA6BE", navy: "#152C77", blue: "#2563EB", blueDk: "#1E3A8A",
  soft: "#E7EEFB", line: "#E2E7F1",
};
const serif = { fontFamily: "'Newsreader', Georgia, serif" };
const sans = { fontFamily: "'Inter', system-ui, sans-serif" };

function useFonts() {
  useEffect(() => {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(l); return () => document.head.removeChild(l);
  }, []);
}

function IconSpectrum() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <line x1="3" y1="8" x2="21" y2="8" stroke={C.blue} strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="16" x2="21" y2="16" stroke={C.blue} strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="3.4" fill={C.blue} />
      <circle cx="16" cy="16" r="3.4" fill={C.navy} />
    </svg>
  );
}
function IconClinic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 3v5.5a4 4 0 108 0V3" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(-2 0)" />
      <circle cx="17" cy="17" r="3.2" stroke={C.navy} strokeWidth="2" />
      <line x1="7" y1="14" x2="7" y2="17.5" stroke={C.blue} strokeWidth="2" strokeLinecap="round" />
      <path d="M7 17.5a6.6 6.6 0 006.6 0" stroke={C.blue} strokeWidth="2" strokeLinecap="round" fill="none" transform="translate(0 -1)" />
    </svg>
  );
}

function TestCard({ to, icon, kicker, title, desc }) {
  return (
    <Link to={to} className="block rounded-3xl p-7 transition-all duration-200 hover:shadow-lg"
      style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 10px 40px rgba(20,33,61,0.06)", textDecoration: "none" }}>
      <div className="flex items-center justify-center rounded-2xl mb-5" style={{ width: 48, height: 48, background: C.soft }}>{icon}</div>
      <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.14em" }}>{kicker}</span>
      <h3 className="mt-1" style={{ ...serif, fontSize: 24, fontWeight: 500, color: C.navy, lineHeight: 1.15 }}>{title}</h3>
      <p className="mt-3" style={{ color: C.sub, fontSize: 15, lineHeight: 1.55 }}>{desc}</p>
      <span className="inline-flex items-center gap-1 mt-5 text-sm font-semibold" style={{ color: C.blue }}>
        Abrir <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
      </span>
    </Link>
  );
}

function Landing() {
  useFonts();
  return (
    <div className="min-h-screen w-full flex items-center justify-center py-12 px-4" style={{ background: C.paper, ...sans, color: C.ink }}>
      <div className="w-full" style={{ maxWidth: 760 }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="rounded-full" style={{ width: 10, height: 10, background: C.blue }} />
          <span className="text-xs uppercase" style={{ color: C.faint, letterSpacing: "0.18em" }}>Proceso de selección</span>
        </div>

        <h1 style={{ ...serif, fontSize: 46, lineHeight: 1.05, fontWeight: 500, color: C.navy, maxWidth: 560 }}>
          Evaluaciones para<br />candidatos
        </h1>
        <p className="mt-4" style={{ color: C.sub, fontSize: 17, lineHeight: 1.6, maxWidth: 520 }}>
          Elige la evaluación que te compartimos. Toma pocos minutos y nos ayuda a conocerte mejor antes de la entrevista.
        </p>

        <div className="grid gap-5 mt-9" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <TestCard to="/estilo" icon={<IconSpectrum />} kicker="15 preguntas · ~5 min"
            title="Evaluación de estilo de trabajo"
            desc="Te ubicas entre distintas formas de trabajar y al final ves tu perfil. No hay respuestas correctas." />
          <TestCard to="/tecnica" icon={<IconClinic />} kicker="~40 min"
            title="Prueba técnica — Médico Veterinario"
            desc="Cálculo de dosis, manejo de medicamentos, farmacología y casos clínicos." />
        </div>

        <p className="mt-10 text-xs" style={{ color: C.faint }}>
          Tus respuestas se usan únicamente para el proceso de selección.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/estilo" element={<EvaluacionEstilo />} />
        <Route path="/tecnica" element={<PruebaTecnica />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}