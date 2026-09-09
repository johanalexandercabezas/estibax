import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useSedes } from '../context/SedeContext';
import { Card, ErrorAlert, PageHeader, Spinner } from '../components/ui';

interface SedeRef {
  id: string;
  nombre: string;
}

interface Activo {
  estadoFisico: string;
  estadoLogistico: string;
  estadoOperativo: string;
  ubicacion: {
    nombre: string;
    bodega?: { planta?: { sede?: SedeRef } };
  } | null;
}

const sedeDe = (a: Activo): SedeRef | null => a.ubicacion?.bodega?.planta?.sede ?? null;

function kpisDe(lista: Activo[]) {
  const conUbicacion = lista.filter((a) => a.ubicacion).length;
  const dañados = lista.filter((a) => a.estadoFisico === 'DANADO' || a.estadoFisico === 'CRITICO').length;
  const bloqueados = lista.filter((a) => a.estadoOperativo === 'BLOQUEADO').length;
  const perdidas = lista.filter((a) => a.estadoLogistico === 'PERDIDA').length;
  return {
    exactitud: lista.length ? Math.round((conUbicacion / lista.length) * 100) : 100,
    sanidad: lista.length ? Math.round(((lista.length - dañados) / lista.length) * 100) : 100,
    dañados,
    bloqueados,
    perdidas,
    total: lista.length,
  };
}

export default function Indicadores() {
  const { sedeActiva } = useSedes();
  const [activos, setActivos] = useState<Activo[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Todo el inventario en una sola petición: el filtro por sede se aplica
    // en cliente y se aprovecha el total para los KPIs comparativos por sede.
    api<Activo[]>('/activos')
      .then(setActivos)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error de conexión'));
  }, []);

  const listaSede = useMemo(() => {
    const lista = activos ?? [];
    if (!sedeActiva) return lista;
    return lista.filter((a) => sedeDe(a)?.id === sedeActiva.id);
  }, [activos, sedeActiva]);

  const ind = useMemo(() => kpisDe(listaSede), [listaSede]);

  const kpisPorSede = useMemo(() => {
    const mapa = new Map<string, { nombre: string; lista: Activo[] }>();
    for (const a of activos ?? []) {
      const sede = sedeDe(a);
      const nombre = sede?.nombre ?? 'Sin sede asignada';
      const fila = mapa.get(nombre) ?? { nombre, lista: [] };
      fila.lista.push(a);
      mapa.set(nombre, fila);
    }
    return [...mapa.values()]
      .map(({ nombre, lista }) => ({ nombre, ...kpisDe(lista) }))
      .sort((a, b) => b.total - a.total);
  }, [activos]);

  return (
    <>
      <PageHeader
        title="Indicadores"
        subtitle={
          sedeActiva
            ? `Métricas de sanidad del inventario y control operativo · Sede: ${sedeActiva.nombre}`
            : 'Métricas de sanidad del inventario y control operativo (todas las sedes)'
        }
      />
      {error && <ErrorAlert message={error} />}
      {!activos && !error && <Spinner />}
      {activos && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Gauge
            titulo="Exactitud de inventario"
            valor={ind.exactitud}
            desc="Activos con ubicación asignada"
          />
          <Gauge
            titulo="Sanidad de flota"
            valor={ind.sanidad}
            desc="Activos en estado BUENO o REGULAR"
          />
          <Card title="Excepciones">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-600">Dañados / críticos</span>
                <span className="font-semibold text-danger">{ind.dañados}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Bloqueados</span>
                <span className="font-semibold text-orange-600">{ind.bloqueados}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Pérdidas</span>
                <span className="font-semibold text-danger">{ind.perdidas}</span>
              </li>
              <li className="flex justify-between border-t border-gray-100 pt-2">
                <span className="text-gray-600">Total activos</span>
                <span className="font-semibold text-ink">{ind.total}</span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {activos && kpisPorSede.length > 0 && (
        <div className="mt-6">
          <Card title={`KPIs por sede / plataforma (${kpisPorSede.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th className="pb-2">Sede / Plataforma</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-right">Exactitud</th>
                    <th className="pb-2 text-right">Sanidad</th>
                    <th className="pb-2 text-right">Dañados</th>
                    <th className="pb-2 text-right">Bloqueados</th>
                    <th className="pb-2 text-right">Pérdidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kpisPorSede.map((s) => (
                    <tr key={s.nombre} className={sedeActiva?.nombre === s.nombre ? 'bg-green-50/60' : ''}>
                      <td className="py-2 font-medium text-gray-900">{s.nombre}</td>
                      <td className="py-2 text-right text-gray-700">{s.total}</td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          s.exactitud >= 90 ? 'text-brand-600' : s.exactitud >= 70 ? 'text-orange-600' : 'text-danger'
                        }`}
                      >
                        {s.exactitud}%
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          s.sanidad >= 90 ? 'text-brand-600' : s.sanidad >= 70 ? 'text-orange-600' : 'text-danger'
                        }`}
                      >
                        {s.sanidad}%
                      </td>
                      <td className={`py-2 text-right ${s.dañados > 0 ? 'font-medium text-danger' : 'text-gray-600'}`}>
                        {s.dañados || ''}
                      </td>
                      <td className={`py-2 text-right ${s.bloqueados > 0 ? 'font-medium text-orange-600' : 'text-gray-600'}`}>
                        {s.bloqueados || ''}
                      </td>
                      <td className={`py-2 text-right ${s.perdidas > 0 ? 'font-medium text-danger' : 'text-gray-600'}`}>
                        {s.perdidas || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Gauge({ titulo, valor, desc }: { titulo: string; valor: number; desc: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = valor >= 90 ? 'stroke-brand-600' : valor >= 70 ? 'stroke-yellow-500' : 'stroke-danger';
  return (
    <Card>
      <p className="text-sm font-medium text-gray-700">{titulo}</p>
      <div className="mt-3 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
          <circle cx="60" cy="60" r={r} className="fill-none stroke-gray-100" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            className={`fill-none ${color} transition-all`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * valor) / 100}
          />
        </svg>
        <span className="-ml-[7.2rem] mt-0 rotate-0 text-2xl font-bold text-ink">{valor}%</span>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">{desc}</p>
    </Card>
  );
}