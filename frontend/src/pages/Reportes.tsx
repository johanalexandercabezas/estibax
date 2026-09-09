import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSedes } from '../context/SedeContext';
import { useReportes, type NovedadReporte } from '../hooks/useReportes';
import type { Movimiento } from './Movimientos';
import { Badge, Button, Card, ErrorAlert, EmptyState, PageHeader, Spinner } from '../components/ui';

interface NovedadData {
  id: string;
  fecha: string;
  estado: string;
  disposicion: string | null;
  descripcion: string;
  causa: string | null;
  responsable: string | null;
  reparacion: number | null;
  valor: number | null;
  indemnizacion: number | null;
  activo?: {
    codigo: string;
    ubicacion?: { bodega?: { planta?: { sede?: { nombre: string } } } };
  } | null;
}

export default function Reportes() {
  const { sedeActiva } = useSedes();
  const { exportarMovimientosPDF, exportarKardexPDF, exportarNovedadesPDF } = useReportes();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [novedades, setNovedades] = useState<NovedadData[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [m, n] = await Promise.all([
          api<Movimiento[]>('/movimientos', { params: { desde: desde || undefined, hasta: hasta || undefined, estado: estado || undefined } }),
          api<NovedadData[]>('/novedades', { params: { desde: desde || undefined, hasta: hasta || undefined, estado: estado || undefined } }),
        ]);
        setMovimientos(m);
        setNovedades(n);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar datos para reportes');
      } finally {
        setCargando(false);
      }
    })();
  }, [desde, hasta, estado]);

  if (cargando) return <Spinner label="Cargando datos para reportes…" />;

  const confirmados = movimientos.filter((m) => m.estado === 'CONFIRMADO').length;
  const borradores = movimientos.filter((m) => m.estado === 'BORRADOR').length;
  const revertidos = movimientos.filter((m) => m.estado === 'REVERTIDO').length;

  // Novedades normalizadas para exportación + filtro por sede activa
  const sedeNombre = sedeActiva?.nombre ?? null;
  const novedadesReporte: NovedadReporte[] = novedades.map((n) => ({
    id: n.id,
    fecha: n.fecha,
    estado: n.estado,
    disposicion: n.disposicion,
    descripcion: n.descripcion,
    causa: n.causa,
    responsable: n.responsable,
    reparacion: n.reparacion != null ? Number(n.reparacion) : null,
    indemnizacion: n.indemnizacion != null ? Number(n.indemnizacion) : null,
    sede: n.activo?.ubicacion?.bodega?.planta?.sede?.nombre ?? null,
    activo: n.activo ? { codigo: n.activo.codigo } : null,
  }));
  const novedadesFiltradas = sedeNombre
    ? novedadesReporte.filter((n) => n.sede === sedeNombre)
    : novedadesReporte;
  const abiertas = novedadesFiltradas.filter((n) => n.estado === 'ABIERTA').length;
  const enReparacion = novedadesFiltradas.filter(
    (n) => n.estado === 'EN_REPARACION' || n.estado === 'EN_INVESTIGACION' || n.disposicion === 'REPARACION',
  ).length;
  const cerradas = novedadesFiltradas.filter((n) => n.estado === 'CERRADA').length;

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle={
          sedeNombre
            ? `Exportación de movimientos, kardex y novedades para auditoría y conciliación · Sede: ${sedeNombre}`
            : 'Exportación de movimientos, kardex y novedades para auditoría y conciliación'
        }
      />
      <ErrorAlert message={error} />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-gray-600">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 block w-full rounded-xl2 border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-gray-200" /></label>
          <label className="text-sm text-gray-600">Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 block w-full rounded-xl2 border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-gray-200" /></label>
          <label className="text-sm text-gray-600">Estado<select value={estado} onChange={(e) => setEstado(e.target.value)} className="mt-1 block w-full rounded-xl2 border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-gray-200"><option value="">Todos</option><option value="BORRADOR">Borrador</option><option value="CONFIRMADO">Confirmado</option><option value="REVERTIDO">Revertido</option><option value="ABIERTA">Abierta</option><option value="CERRADA">Cerrada</option></select></label>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Movimientos confirmados</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{confirmados}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Borradores pendientes</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{borradores}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Revertidos (auditoría)</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{revertidos}</p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Novedades abiertas</p>
          <p className="mt-1 text-2xl font-semibold text-danger">{abiertas}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">En investigación / reparación</p>
          <p className="mt-1 text-2xl font-semibold text-orange-600">{enReparacion}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Cerradas (resueltas)</p>
          <p className="mt-1 text-2xl font-semibold text-brand-600">{cerradas}</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Reporte de movimientos">
          {movimientos.length === 0 ? (
            <EmptyState message="No hay movimientos para exportar." />
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500">
                Documento, tipo, fecha, cliente, cantidad de activos, firma y estado de los{' '}
                {movimientos.length} movimientos registrados.
              </p>
              <Button onClick={() => exportarMovimientosPDF(movimientos)}>📄 Movimientos PDF</Button>
            </>
          )}
        </Card>

        <Card title="Reporte de kardex detallado">
          {movimientos.length === 0 ? (
            <EmptyState message="No hay kardex para exportar." />
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500">
                Detalle por activo con entradas y salidas, tal como el ledger inmutable.
              </p>
              <Button onClick={() => exportarKardexPDF(movimientos)}>📄 Kardex PDF</Button>
            </>
          )}
        </Card>

        <Card title="Reporte de novedades">
          {novedadesFiltradas.length === 0 ? (
            <EmptyState message="No hay novedades para exportar en el alcance actual." />
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <Badge color="red">Abiertas {abiertas}</Badge>
                <Badge color="orange">En curso {enReparacion}</Badge>
                <Badge color="green">Cerradas {cerradas}</Badge>
              </div>
              <p className="mb-4 text-sm text-gray-500">
                Expediente de daños, pérdidas y resolución de {novedadesFiltradas.length} novedades
                {sedeNombre ? ` en ${sedeNombre}` : ' (todas las sedes)'} con firma corporativa ICOLTRANS.
              </p>
              <Button
                onClick={() =>
                  exportarNovedadesPDF(novedadesFiltradas, 'Reporte de Novedades', sedeNombre)
                }
              >
                📄 Novedades PDF
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
