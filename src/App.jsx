import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RutaProtegida from "./components/RutaProtegida";

import Inicio from "./pages/Inicio";
import Servicios from "./pages/Servicios";
import Requisitos from "./pages/Requisitos";
import Contacto from "./pages/Contacto";
import Tramites from "./pages/Tramites";
import Formulario from "./pages/Formulario";
import Actualizar from "./pages/Actualizar";
import Pago from "./pages/Pago";
import Login from "./pages/Login";
import Recibos from "./pages/Recibos";
import PagoRecibo from "./pages/PagoRecibo";
import Comprobante from "./pages/Comprobante";
import Caja from "./pages/Caja";
import Panel from "./pages/Panel";

const soloCliente = (pagina) => <RutaProtegida roles={["cliente"]}>{pagina}</RutaProtegida>;

// Aquí viven solo las rutas: cada URL se asocia a una página (pages/).
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Páginas con el header y footer principales */}
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="requisitos" element={<Requisitos />} />
        <Route path="contacto" element={<Contacto />} />
        <Route path="tramites" element={<Tramites />} />
        <Route path="formulario" element={soloCliente(<Formulario />)} />
        <Route path="actualizar" element={soloCliente(<Actualizar />)} />
        <Route path="pago" element={soloCliente(<Pago />)} />
      </Route>

      {/* Páginas con su propia cabecera */}
      <Route path="/recibos" element={<Recibos />} />
      <Route path="/pago-recibo" element={<PagoRecibo />} />
      <Route path="/comprobante" element={<RutaProtegida><Comprobante /></RutaProtegida>} />
      <Route path="/caja" element={<RutaProtegida roles={["cajero", "administrador"]}><Caja /></RutaProtegida>} />
      <Route path="/panel" element={<RutaProtegida roles={["administrador", "empleado"]}><Panel /></RutaProtegida>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
