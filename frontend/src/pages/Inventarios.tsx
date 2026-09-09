import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useSedes } from '../context/SedeContext';
import { Button, Card, ErrorAlert, PageHeader, Spinner } from '../components/ui';

interface SedeRef {
  id: string;
  nombre: string;
}

interface Activo {
  id: string;
  codigo: string;
  propiedad: string;
  estadoFisico: string;
  estadoLogistico: string;
  estadoOperativo: string;
  tipoActivo: { nombre: string };
  ubicacion: {
    nombre: string;
    bodega?: { planta?: { sede?: SedeRef } };
  } | null;
}

const sedeDe = (a: Activo): SedeRef | null => a.ubicacion?.bodega?.planta?.sede ?? null;

function conteoPor<T extends string>(lista: Activo[], fn: (a: Activo) => T) {
  const mapa = new Map<T, number>();
  for (const a of lista) mapa.set(fn(a), (mapa.get(fn(a)) ?? 0) + 1);
  return Object.fromEntries(mapa);
}

export default function Inventarios() {
  const { sedeActiva } = useSedes();
  const [activos, setActivos] = useState<Activo[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Se trae TODO el inventario una sola vez: el filtro por sede se hace
    // en cliente para permitir la comparativa entre plataformas.
    api<Activo[]>('/activos')
      .then(setActivos)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error de conexión'));
  }, []);

  const listaSede = useMemo(() => {
    const lista = activos ?? [];
    if (!sedeActiva) return lista;
    return lista.filter((a) => sedeDe(a)?.id === sedeActiva.id);
  }, [activos, sedeActiva]);

  const porSede = useMemo(() => {
    const mapa = new Map<string, { nombre: string; total: number; enCliente: number; danados: number; sinUbicacion: number }>();
    for (const a of activos ?? []) {
      const sede = sedeDe(a);
      const nombre = sede?.nombre ?? 'Sin sede asignada';
      const fila = mapa.get(nombre) ?? { nombre, total: 0, enCliente: 0, danados: 0, sinUbicacion: 0 };
      fila.total += 1;
      if (a.estadoLogistico === 'EN_CLIENTE') fila.enCliente += 1;
      if (a.estadoFisico === 'DANADO' || a.estadoFisico === 'CRITICO') fila.danados += 1;
      if (!a.ubicacion) fila.sinUbicacion += 1;
      mapa.set(nombre, fila);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [activos]);

  const resumen = useMemo(() => {
    const lista = listaSede;
    return {
      total: lista.length,
      porLogistico: conteoPor(lista, (a) => a.estadoLogistico),
      porPropiedad: conteoPor(lista, (a) => a.propiedad),
      porTipo: conteoPor(lista, (a) => a.tipoActivo?.nombre ?? 'Sin tipo'),
      sinUbicacion: lista.filter((a) => !a.ubicacion).length,
    };
  }, [listaSede]);

  function exportarCSV() {
    if (porSede.length === 0) return;
    const filas: string[][] = [
      ['ICOLTRANS - ESTIBAX', 'Inventario por sede / plataforma'],
      ['Alcance', sedeActiva?.nombre ?? 'Todas las sedes'],
      [`Generado el: ${new Date().toLocaleString('es-CO')}`],
      [],
      ['RESUMEN POR SEDE'],
      ['Sede / Plataforma', 'Total', 'En cliente', 'Danados / criticos', 'Sin ubicacion'],
      ...porSede.map((s) => [s.nombre, String(s.total), String(s.enCliente), String(s.danados), String(s.sinUbicacion)]),
      [],
      ['DETALLE DE ACTIVOS'],
      ['Sede', 'Codigo', 'Tipo', 'Propiedad', 'Estado fisico', 'Estado logistico', 'Estado operativo', 'Ubicacion (zona)'],
      ...(listaSede as Activo[]).map((a) => [
        sedeDe(a)?.nombre ?? 'Sin sede',
        a.codigo,
        a.tipoActivo?.nombre ?? 'Sin tipo',
        a.propiedad,
        a.estadoFisico,
        a.estadoLogistico,
        a.estadoOperativo,
        a.ubicacion?.nombre ?? 'Sin ubicacion',
      ]),
    ];
    const escapar = (v: string) => (/[",;\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
    const contenido = '\uFEFF' + filas.map((f) => f.map(escapar).join(',')).join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-${sedeActiva ? sedeActiva.nombre.toLowerCase() : 'todas-las-sedes'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Inventarios"
        subtitle={
          sedeActiva
            ? `Composición del inventario por propiedad, tipo y estado logístico · Sede: ${sedeActiva.nombre}`
            : 'Composición del inventario por propiedad, tipo y estado logístico (todas las sedes)'
        }
      />
      {error && <ErrorAlert message={error} />}
      {!activos && !error && <Spinner />}
      {activos && (
        <>
          <p className="mb-4 text-sm text-gray-500">
            Total de activos{sedeActiva ? ` en ${sedeActiva.nombre}` : ''}:{' '}
            <span className="font-semibold text-ink">{resumen.total}</span>
            {resumen.sinUbicacion > 0 && (
              <span className="ml-3 text-orange-600">
                {resumen.sinUbicacion} sin ubicación asignada
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Por estado logístico">
              <Tabla datos={resumen.porLogistico} />
            </Card>
            <Card title="Por propiedad">
              <Tabla datos={resumen.porPropiedad} />
            </Card>
            <Card title="Por tipo de activo">
              <Tabla datos={resumen.porTipo} />
            </Card>
          </div>

          <div className="mt-6">
            <Card title={`Inventario por sede / plataforma (${porSede.length})`}>
              <div className="mb-3 flex justify-end">
                <Button variant="secondary" onClick={exportarCSV} disabled={porSede.length === 0}>
                  ⬇ Exportar Excel (CSV)
                </Button>
              </div>
              {porSede.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-gray-500">
                        <th className="pb-2">Sede / Plataforma</th>
                        <th className="pb-2 text-right">Total</th>
                        <th className="pb-2 text-right">En cliente</th>
                        <th className="pb-2 text-right">Dañados</th>
                        <th className="pb-2 text-right">Sin ubicación</th>
                        <th className="pb-2">Distribución</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {porSede.map((s) => {
                        const max = Math.max(1, ...porSede.map((x) => x.total));
                        return (
                          <tr key={s.nombre} className={sedeActiva?.nombre === s.nombre ? 'bg-green-50/60' : ''}>
                            <td className="py-2 font-medium text-gray-900">{s.nombre}</td>
                            <td className="py-2 text-right font-semibold text-ink">{s.total}</td>
                            <td className="py-2 text-right text-gray-600">{s.enCliente || ''}</td>
                            <td className={`py-2 text-right ${s.danados > 0 ? 'font-medium text-danger' : 'text-gray-600'}`}>
                              {s.danados || ''}
                            </td>
                            <td className={`py-2 text-right ${s.sinUbicacion > 0 ? 'font-medium text-orange-600' : 'text-gray-600'}`}>
                              {s.sinUbicacion || ''}
                            </td>
                            <td className="py-2">
                              <div className="h-1.5 w-40 rounded-full bg-gray-100">
                                <div
                                  className="h-1.5 rounded-full bg-brand-500"
                                  style={{ width: `${(s.total / max) * 100}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Tabla({ datos }: { datos: Record<string, number> }) {
  const entradas = Object.entries(datos);
  const max = Math.max(1, ...entradas.map(([, v]) => v));
  if (entradas.length === 0) return <p className="text-sm text-gray-500">Sin datos.</p>;
  return (
    <ul className="space-y-2.5">
      {entradas.map(([k, v]) => (
        <li key={k}>
          <div className="flex items-center justify-between text-sm">
            <span className="capitalize text-gray-700">{k.replaceAll('_', ' ').toLowerCase()}</span>
            <span className="font-semibold text-ink">{v}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-brand-500"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}