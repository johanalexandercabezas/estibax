import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BadgeEstado, Card, EmptyState, ErrorAlert, PageHeader, Spinner } from '../components/ui';

interface Movimiento {
  id: string;
  documento: string;
  tipo: string;
  fechaEfectiva: string;
  estado: string;
  cliente?: { nombre: string } | null;
  lineas?: unknown[];
}

export default function Kardex() {
  const [movs, setMovs] = useState<Movimiento[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Movimiento[]>('/movimientos', { params: { estado: 'CONFIRMADO' } })
      .then((l) => setMovs([...l].reverse()))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error de conexión'));
  }, []);

  return (
    <>
      <PageHeader
        title="Kardex"
        subtitle="Ledger inmutable de movimientos confirmados (solo lectura)"
      />
      {error && <ErrorAlert message={error} />}
      {!movs && !error && <Spinner />}
      {movs && (
        <Card>
          {movs.length === 0 ? (
            <EmptyState message="Aún no hay movimientos confirmados." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Documento</th>
                    <th className="py-2 pr-4">Tipo</th>
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">Líneas</th>
                    <th className="py-2 pr-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movs.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-ink">{m.documento}</td>
                      <td className="py-2.5 pr-4">
                        <BadgeEstado value={m.tipo} />
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {new Date(m.fechaEfectiva).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">{m.cliente?.nombre ?? '—'}</td>
                      <td className="py-2.5 pr-4">{m.lineas?.length ?? 0}</td>
                      <td className="py-2.5 pr-4">
                        <BadgeEstado value={m.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}