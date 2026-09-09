import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlass,
  Package,
  Truck,
  CirclesThree,
  Warning,
  X,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useSedes } from '../context/SedeContext';
import { BadgeEstado, Card, ErrorAlert, PageHeader, Spinner } from '../components/ui';
import type { ReactNode } from 'react';

interface Activo {
  id: string;
  codigo: string;
  propiedad: string;
  estadoFisico: string;
  estadoLogistico: string;
  estadoOperativo: string;
  tipoActivo: { nombre: string } | null;
  cliente: { nombre: string } | null;
  ubicacion: { nombre: string } | null;
}

interface NovedadAlerta {
  id: string;
  estado: string;
  fecha: string;
  descripcion: string;
  activo?: {
    codigo: string;
    ubicacion?: {
      bodega?: { planta?: { sede?: { id: string; nombre: string } } };
    };
  } | null;
}

/** KPI superior: tarjeta blanca, icono acentuado y valor grande. */
function Kpi({
  titulo,
  valor,
  icono,
  fondo = 'bg-brand-600',
}: {
  titulo: string;
  valor: number;
  icono: ReactNode;
  fondo?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl2 bg-white p-5 shadow-card">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${fondo}`}
      >
        {icono}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{titulo}</p>
        <p className="text-3xl font-semibold leading-tight text-ink">{valor}</p>
      </div>
    </div>
  );
}
export default function Dashboard() {
  const { sedeActiva } = useSedes();
  const [activos, setActivos] = useState<Activo[] | null>(null);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [zona, setZona] = useState('');
  const [material, setMaterial] = useState('');

  useEffect(() => {
    let activo = true;
    const cargarEnVivo = () => api<Activo[]>('/activos', {
      params: { sedeId: sedeActiva?.id || undefined },
    })
      .then((data) => {
        if (!activo) return;
        setActivos(data);
        localStorage.setItem('estibax_kpis_ia', JSON.stringify({
          actualizadoEn: new Date().toISOString(),
          totalActivos: data.length,
          disponibles: data.filter((a) => a.estadoLogistico === 'DISPONIBLE').length,
          enCliente: data.filter((a) => a.estadoLogistico === 'EN_CLIENTE').length,
          bloqueados: data.filter((a) => a.estadoOperativo === 'BLOQUEADO').length,
        }));
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'Error de conexión');
      });
    cargarEnVivo();
    const intervalo = window.setInterval(cargarEnVivo, 60000);
    return () => { activo = false; window.clearInterval(intervalo); };
  }, [sedeActiva?.id]);

  // Alertas: novedades abiertas o en investigación (contextualizadas a la sede activa)
  const [novedades, setNovedades] = useState<NovedadAlerta[]>([]);

  useEffect(() => {
    api<NovedadAlerta[]>('/novedades')
      .then(setNovedades)
      .catch(() => setNovedades([])); // no bloquea el dashboard
  }, []);

  const alertas = useMemo(() => {
    const abiertas = novedades.filter(
      (n) => n.estado === 'ABIERTA' || n.estado === 'EN_INVESTIGACION' || n.estado === 'EN_REPARACION',
    );
    const enSede = sedeActiva
      ? abiertas.filter((n) => n.activo?.ubicacion?.bodega?.planta?.sede?.id === sedeActiva.id)
      : abiertas;
    return enSede.slice(0, 6);
  }, [novedades, sedeActiva]);

  const conteo = useMemo(() => {
    const lista = activos ?? [];
    return {
      total: lista.length,
      enUso: lista.filter(
        (a) => a.estadoLogistico === 'EN_CLIENTE' || a.estadoLogistico === 'EN_TRANSITO',
      ).length,
      disponibles: lista.filter(
        (a) => a.estadoLogistico === 'DISPONIBLE' && a.estadoOperativo === 'LIBRE',
      ).length,
      danadas: lista.filter(
        (a) =>
          a.estadoFisico === 'DANADO' ||
          a.estadoFisico === 'CRITICO' ||
          a.estadoLogistico === 'EN_REPARACION',
      ).length,
      bloqueados: lista.filter((a) => a.estadoOperativo === 'BLOQUEADO').length,
      perdidas: lista.filter((a) => a.estadoLogistico === 'PERDIDA').length,
      enCliente: lista.filter((a) => a.estadoLogistico === 'EN_CLIENTE').length,
    };
  }, [activos]);

  /** Filtros rápidos derivados de los datos (zonas = ubicaciones, materiales = tipos de activo). */
  const { zonas, materiales } = useMemo(() => {
    const lista = activos ?? [];
    const unicos = (vals: (string | undefined)[]) =>
      Array.from(new Set(vals.filter((v): v is string => Boolean(v)))).sort();
    return {
      zonas: unicos(lista.map((a) => a.ubicacion?.nombre)),
      materiales: unicos(lista.map((a) => a.tipoActivo?.nombre)),
    };
  }, [activos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (activos ?? []).filter((a) => {
      if (zona && a.ubicacion?.nombre !== zona) return false;
      if (material && a.tipoActivo?.nombre !== material) return false;
      if (!q) return true;
      return (
        a.codigo.toLowerCase().includes(q) ||
        (a.cliente?.nombre ?? '').toLowerCase().includes(q) ||
        (a.ubicacion?.nombre ?? '').toLowerCase().includes(q)
      );
    });
  }, [activos, busqueda, zona, material]);

  const hayFiltros = Boolean(busqueda || zona || material);

  return (
    <>
      <PageHeader
        title="Torre de Control"
        subtitle="Estado global de las estibas y excepciones operativas"
      />

      {error && <ErrorAlert message={error} />}
      {!activos && !error && <Spinner label="Cargando indicadores…" />}
{activos && (
        <>
          {/* KPIs superiores */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Kpi titulo="Total Estibas" valor={conteo.total} icono={<Package size={24} weight="duotone" />} />
            <Kpi
              titulo="En Uso"
              valor={conteo.enUso}
              icono={<Truck size={24} weight="duotone" />}
              fondo="bg-blue-600"
            />
            <Kpi
              titulo="Disponibles"
              valor={conteo.disponibles}
              icono={<CirclesThree size={24} weight="duotone" />}
              fondo="bg-emerald-600"
            />
            <Kpi
              titulo="Dañadas / Mantenimiento"
              valor={conteo.danadas}
              icono={<Warning size={24} weight="duotone" />}
              fondo="bg-red-600"
            />
          </div>

          {/* Búsqueda global + filtros rápidos */}
          <div className="mt-6 rounded-xl2 bg-white p-4 shadow-card">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={18}
                  weight="bold"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código, cliente o ubicación…"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} weight="bold" />
                  </button>
                )}
              </div>
              <select
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:bg-white focus:outline-none"
              >
                <option value="">Todas las zonas</option>
                {zonas.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-ink focus:border-brand-500 focus:bg-white focus:outline-none"
              >
                <option value="">Todo el material</option>
                {materiales.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {hayFiltros && (
                <button
                  onClick={() => {
                    setBusqueda('');
                    setZona('');
                    setMaterial('');
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
{/* Tabla interactiva de estibas */}
          <div className="mt-6">
            <Card title={`Estibas (${filtrados.length})`}>
              {filtrados.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {hayFiltros
                    ? 'Ninguna estiba coincide con los filtros aplicados.'
                    : 'Aún no hay estibas registradas.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2.5 pr-4">Código</th>
                        <th className="py-2.5 pr-4">Material</th>
                        <th className="py-2.5 pr-4">Propiedad</th>
                        <th className="py-2.5 pr-4">Ubicación</th>
                        <th className="py-2.5 pr-4">Cliente</th>
                        <th className="py-2.5 pr-4">Físico</th>
                        <th className="py-2.5 pr-4">Logístico</th>
                        <th className="py-2.5 pr-4">Operativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtrados.slice(0, 12).map((a) => (
                        <tr key={a.id} className="transition-colors hover:bg-brand-50/60">
                          <td className="py-2.5 pr-4 font-semibold text-ink">
                            <Link to={`/activos/${a.id}`} className="hover:text-brand-700 hover:underline">
                              {a.codigo}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-4">{a.tipoActivo?.nombre ?? '—'}</td>
                          <td className="py-2.5 pr-4">
                            <BadgeEstado value={a.propiedad} />
                          </td>
                          <td className="py-2.5 pr-4">{a.ubicacion?.nombre ?? '—'}</td>
                          <td className="py-2.5 pr-4">{a.cliente?.nombre ?? '—'}</td>
                          <td className="py-2.5 pr-4">
                            <BadgeEstado value={a.estadoFisico} />
                          </td>
                          <td className="py-2.5 pr-4">
                            <BadgeEstado value={a.estadoLogistico} />
                          </td>
                          <td className="py-2.5 pr-4">
                            <BadgeEstado value={a.estadoOperativo} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtrados.length > 12 && (
                    <p className="mt-3 text-center text-xs text-gray-500">
                      Mostrando 12 de {filtrados.length}. Refina los filtros para ver más.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Excepciones accionables */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Excepciones activas">
              <ul className="divide-y divide-gray-100">
                <Indicador color="bg-red-500" label="Pérdidas registradas" valor={conteo.perdidas} to="/activos" />
                <Indicador color="bg-red-500" label="Daños (DAÑADO / CRÍTICO)" valor={conteo.danadas} to="/novedades" />
                <Indicador color="bg-orange-500" label="Activos bloqueados" valor={conteo.bloqueados} to="/activos" />
                <Indicador color="bg-blue-500" label="En custodia de clientes" valor={conteo.enCliente} to="/clientes" />
              </ul>
            </Card>

            <Card title="Accesos rápidos">
              <div className="grid grid-cols-2 gap-3">
                <AccesoRapido to="/movimientos" titulo="Registrar movimiento" desc="Entradas, salidas, traslados y devoluciones" />
                <AccesoRapido to="/inventarios" titulo="Inventarios" desc="Existencias por ubicación y propiedad" />
                <AccesoRapido to="/kardex" titulo="Kardex" desc="Historial inmutable de movimientos" />
                <AccesoRapido to="/clientes" titulo="Clientes" desc="Reglas de despacho y custodia" />
              </div>
            </Card>
          </div>

          {/* Alertas: novedades abiertas accionables */}
          {alertas.length > 0 && (
            <div className="mt-6">
              <Card title={`Alertas recientes · Novedades abiertas (${alertas.length})`}>
                <ul className="divide-y divide-gray-100">
                  {alertas.map((n) => (
                    <li key={n.id}>
                      <Link
                        to="/novedades"
                        className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:bg-gray-50"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                          <span className="font-medium text-ink">{n.activo?.codigo ?? '—'}</span>
                          <span className="truncate text-gray-600">{n.descripcion}</span>
                        </span>
                        <BadgeEstado value={n.estado} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Indicador({
  color,
  label,
  valor,
  to,
}: {
  color: string;
  label: string;
  valor: number;
  to: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between py-3 text-sm transition-colors hover:bg-gray-50"
      >
        <span className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <span className="text-gray-700">{label}</span>
        </span>
        <span className="font-semibold text-ink">{valor}</span>
      </Link>
    </li>
  );
}

function AccesoRapido({
  to,
  titulo,
  desc,
}: {
  to: string;
  titulo: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/50"
    >
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      <p className="mt-1 text-xs text-gray-500">{desc}</p>
    </Link>
  );
}