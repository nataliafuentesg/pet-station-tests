import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import EvaluacionEstilo from "./EvaluacionEstilo";
import PruebaTecnica from "./PruebaTecnica";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/estilo" element={<EvaluacionEstilo />} />
        <Route path="/tecnica" element={<PruebaTecnica />} />
        <Route path="*" element={
          <div style={{ padding: 40, fontFamily: "system-ui" }}>
            <Link to="/estilo">Ir a evaluación de estilo</Link><br/>
            <Link to="/tecnica">Ir a prueba técnica</Link>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}