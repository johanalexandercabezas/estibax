import { useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Select } from 'antd';
import { EnvironmentOutlined, PrinterOutlined } from '@ant-design/icons';
import {
  SquaresFour,
  ArrowsLeftRight,
  ClipboardText,
  Stack,
  Users,
  Money,
  Warning,
  ChartBar,
  FileText,
  SealCheck,
  GearSix,
  Buildings,
  List,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useSedes } from '../context/SedeContext';
import { puedeModulo } from '../lib/permisos';
import AsistenteIA from './AsistenteIA';

interface ItemMenu {
  to: string;
  label: string;
  icon: ComponentType<any>;
  modulo?: string;
  end?: boolean;
}

const grupos: { titulo: string; items: ItemMenu[] }[] = [
  {
    titulo: '',
    items: [{ to: '/', label: 'Torre de Control', icon: SquaresFour, end: true }],
  },
  {
    titulo: 'Operación',
    items: [
      { to: '/operaciones', label: 'Operaciones', icon: ArrowsLeftRight, modulo: 'movimientos' },
      { to: '/movimientos', label: 'Movimientos históricos', icon: List, modulo: 'movimientos' },
      { to: '/kardex', label: 'Kardex', icon: ClipboardText, modulo: 'kardex' },
      { to: '/inventarios', label: 'Inventarios', icon: Stack, modulo: 'activos' },
      { to: '/etiquetas', label: 'Etiquetas', icon: PrinterOutlined, modulo: 'activos' },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { to: '/clientes', label: 'Clientes y Puntos', icon: Users, modulo: 'clientes' },
      { to: '/economico', label: 'Cobros', icon: Money, modulo: 'economico' },
      { to: '/novedades', label: 'Alertas', icon: Warning, modulo: 'novedades' },
      { to: '/indicadores', label: 'Indicadores', icon: ChartBar, modulo: 'kardex' },
      { to: '/reportes', label: 'Reportes', icon: FileText, modulo: 'kardex' },
    ],
  },
  {
    titulo: 'Control',
    items: [
      { to: '/auditoria', label: 'Auditoría', icon: SealCheck, modulo: 'auditoria' },
      { to: '/configuracion', label: 'Configuración', icon: GearSix, modulo: 'configuracion' },
      { to: '/empresas', label: 'Vista para empresas', icon: Buildings, modulo: 'configuracion' },
    ],
  },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { sedes, sedeActiva, setIdSedeActiva, cargando } = useSedes();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra superior (móvil) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Abrir menú"
        >
          {menuAbierto ? <X size={22} /> : <List size={22} />}
        </button>
        <span className="font-semibold text-brand-700">EstibaX</span>
        <span className="w-8" />
      </header>

      <div className="flex">
        {/* Overlay móvil */}
        {menuAbierto && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMenuAbierto(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            menuAbierto ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center border-b border-gray-200 px-5">
            <span className="text-lg font-bold text-brand-700">EstibaX</span>
            <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700">
              v0.1
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {grupos.map((grupo, i) => {
              const visibles = grupo.items.filter((item) => puedeModulo(usuario, item.modulo));
              if (visibles.length === 0) return null;
              return (
                <div key={grupo.titulo || `g${i}`} className={i > 0 ? 'mt-5' : ''}>
                  {grupo.titulo && (
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {grupo.titulo}
                    </p>
                  )}
                  <ul className="space-y-0.5">
                    {visibles.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={() => setMenuAbierto(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl2 px-3 py-2 text-sm font-medium ${
                              isActive
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                size={19}
                                weight={isActive ? 'fill' : 'regular'}
                                className={isActive ? 'text-brand-600' : 'text-gray-400'}
                              />
                              {item.label}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <p className="truncate text-sm font-medium text-gray-900">
              {usuario?.nombre}
            </p>
            <p className="truncate text-xs text-gray-500">{usuario?.email}</p>
            <p className="mt-0.5 text-xs font-medium text-brand-700">{usuario?.rol}</p>
            <button
              onClick={logout}
              className="mt-3 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <EnvironmentOutlined className="text-brand-600" />
              <span className="font-medium text-gray-700">Sede / Plataforma activa:</span>
            </div>
            <Select
              loading={cargando}
              value={sedeActiva?.id}
              placeholder="Seleccionar sede"
              style={{ width: 260 }}
              allowClear
              showSearch
              optionFilterProp="label"
              onChange={(v) => setIdSedeActiva(v ?? null)}
              options={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
            />
          </div>
          <Outlet />
        </main>
      </div>

      {/* Asistente IA (WebLLM, solo lectura) */}
      <AsistenteIA />
    </div>
  );
}
