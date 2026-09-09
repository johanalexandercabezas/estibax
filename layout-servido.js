import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navegacion = [
  { to: '/', label: 'Torre de Control', icon: '▦', end: true },
  { to: '/activos', label: 'Activos', icon: '▣' },
  { to: '/movimientos', label: 'Operaciones', icon: '⇄' },
  { to: '/clientes', label: 'Clientes', icon: '◈' },
  { to: '/transportes', label: 'Transportes', icon: '🚚' },
  { to: '/novedades', label: 'Novedades', icon: '⚠' },
  { to: '/economico', label: 'Cobros y Liquidaciones', icon: '💰' },
  { to: '/reportes', label: 'Reportes', icon: '📄' },
  { to: '/auditoria', label: 'Auditoría', icon: '🔎' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙' },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
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
          ☰
        </button>
        <span className="font-semibold text-blue-700">EstibaX</span>
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
            <span className="text-lg font-bold text-blue-700">EstibaX</span>
            <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
              v0.1
            </span>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navegacion.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <span className="w-5 text-center text-gray-400">{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-gray-200 p-4">
            <p className="truncate text-sm font-medium text-gray-900">
              {usuario?.nombre}
            </p>
            <p className="truncate text-xs text-gray-500">{usuario?.email}</p>
            <p className="mt-0.5 text-xs font-medium text-blue-700">{usuario?.rol}</p>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
