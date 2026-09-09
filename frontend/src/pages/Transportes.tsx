import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, ErrorAlert, EmptyState, PageHeader, Spinner, BadgeEstado } from '../components/ui';

interface Vehiculo {
  id: string;
  placa: string;
  tipo: string;
}

interface Transportista {
  id: string;
  nombre: string;
  documento: string;
}

export default function Transportes() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [transportistas, setTransportistas] = useState<Transportista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [v, t] = await Promise.all([
          api<Vehiculo[]>('/transportes/vehiculos'),
          api<Transportista[]>('/transportes/transportistas'),
        ]);
        setVehiculos(v);
        setTransportistas(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar transportes');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (cargando) return <Spinner label="Cargando transportes…" />;

  return (
    <div>
      <PageHeader
        title="Transportes"
        subtitle="Vehículos y transportistas habilitados para las operaciones"
      />
      <ErrorAlert message={error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Vehículos (${vehiculos.length})`}>
          {vehiculos.length === 0 ? (
            <EmptyState message="No hay vehículos registrados." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="pb-2">Placa</th>
                  <th className="pb-2">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehiculos.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 font-medium text-gray-900">{v.placa}</td>
                    <td className="py-2">
                      <BadgeEstado value={v.tipo || 'PROPIO'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title={`Transportistas (${transportistas.length})`}>
          {transportistas.length === 0 ? (
            <EmptyState message="No hay transportistas registrados." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="pb-2">Nombre</th>
                  <th className="pb-2">Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transportistas.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 font-medium text-gray-900">{t.nombre}</td>
                    <td className="py-2 text-gray-600">{t.documento || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
