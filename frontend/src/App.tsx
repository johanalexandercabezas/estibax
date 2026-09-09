import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SedeProvider } from './context/SedeContext';
import { puedeModulo } from './lib/permisos';
import { estibaxTheme } from './theme/estibaxTheme';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Activos from './pages/Activos';
import FichaActivo from './pages/FichaActivo';
import Movimientos from './pages/Movimientos';
import Operaciones from './pages/Operaciones';
import Clientes from './pages/Clientes';
import Novedades from './pages/Novedades';
import Transportes from './pages/Transportes';
import Economico from './pages/Economico';
import Reportes from './pages/Reportes';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';
import Kardex from './pages/Kardex';
import Inventarios from './pages/Inventarios';
import Indicadores from './pages/Indicadores';
import Etiquetas from './pages/Etiquetas';
import Empresas from './pages/Empresas';

function RutaProtegida({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/** Protege la ruta también por permisos: si el rol no puede, redirige a la Torre de Control. */
function RutaConPermiso({ modulo, children }: { modulo: string; children: ReactElement }) {
  const { usuario } = useAuth();
  if (!puedeModulo(usuario, modulo)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ConfigProvider locale={esES} theme={estibaxTheme}>
      <AuthProvider>
        <SedeProvider>
          <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/activos" element={<RutaConPermiso modulo="activos"><Activos /></RutaConPermiso>} />
            <Route path="/activos/:id" element={<RutaConPermiso modulo="activos"><FichaActivo /></RutaConPermiso>} />
            <Route path="/movimientos" element={<RutaConPermiso modulo="movimientos"><Movimientos /></RutaConPermiso>} />
            <Route path="/operaciones" element={<RutaConPermiso modulo="movimientos"><Operaciones /></RutaConPermiso>} />
            <Route path="/kardex" element={<RutaConPermiso modulo="kardex"><Kardex /></RutaConPermiso>} />
            <Route path="/inventarios" element={<RutaConPermiso modulo="activos"><Inventarios /></RutaConPermiso>} />
            <Route path="/transportes" element={<RutaConPermiso modulo="transportes"><Transportes /></RutaConPermiso>} />
            <Route path="/clientes" element={<RutaConPermiso modulo="clientes"><Clientes /></RutaConPermiso>} />
            <Route path="/economico" element={<RutaConPermiso modulo="economico"><Economico /></RutaConPermiso>} />
            <Route path="/novedades" element={<RutaConPermiso modulo="novedades"><Novedades /></RutaConPermiso>} />
            <Route path="/indicadores" element={<RutaConPermiso modulo="kardex"><Indicadores /></RutaConPermiso>} />
            <Route path="/reportes" element={<RutaConPermiso modulo="kardex"><Reportes /></RutaConPermiso>} />
            <Route path="/auditoria" element={<RutaConPermiso modulo="auditoria"><Auditoria /></RutaConPermiso>} />
            <Route path="/configuracion" element={<RutaConPermiso modulo="configuracion"><Configuracion /></RutaConPermiso>} />
            <Route path="/etiquetas" element={<RutaConPermiso modulo="activos"><Etiquetas /></RutaConPermiso>} />
            <Route path="/empresas" element={<RutaConPermiso modulo="configuracion"><Empresas /></RutaConPermiso>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
        </SedeProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
