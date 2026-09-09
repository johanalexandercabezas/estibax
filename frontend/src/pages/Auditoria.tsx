import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  Badge,
  Card,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '../components/ui';

interface EventoAuditoria {
  id: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  usuarioId: string;
  ip?: string | null;
  detalles?: string | null;
  createdAt: string;
}

export default function Auditoria() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [accion, setAccion] = useState('');
  const [entidad, setEntidad] = useState('');
  const [limite, setLimite] = useState('100');

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const data = await api<EventoAuditoria[]>('/auditoria', {
          params: { accion: accion || undefined, entidad: entidad || undefined, limite },
        });
        setEventos(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar auditoría');
      } finally {
        setCargando(false);
      }
    })();
  }, [accion, entidad, limite]);

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle="Registro inmutable de todas las operaciones (quién, cuándo, qué)"
      />
      <ErrorAlert message={error} />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Acción">
            <Input
              placeholder="p. ej. CONFIRMAR, REVERTIR…"
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
            />
          </Field>
          <Field label="Entidad">
            <Select value={entidad} onChange={(e) => setEntidad(e.target.value)}>
              <option value="">Todas</option>
              <option value="Movimiento">Movimiento</option>
              <option value="Activo">Activo</option>
              <option value="Novedad">Novedad</option>
              <option value="Cliente">Cliente</option>
              <option value="Liquidacion">Liquidacion</option>
              <option value="CobroDiario">CobroDiario</option>
            </Select>
          </Field>
          <Field label="Límite">
            <Select value={limite} onChange={(e) => setLimite(e.target.value)}>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </Select>
          </Field>
        </div>
      </Card>

      {cargando ? (
        <Spinner label="Consultando eventos…" />
      ) : eventos.length === 0 ? (
        <EmptyState message="No hay eventos de auditoría con esos filtros." />
      ) : (
        <Card title={`Eventos (${eventos.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="pb-2">Fecha/Hora</th>
                  <th className="pb-2">Acción</th>
                  <th className="pb-2">Entidad</th>
                  <th className="pb-2">Detalle</th>
                  <th className="pb-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eventos.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2 whitespace-nowrap text-gray-600">
                      {new Date(ev.createdAt).toLocaleString('es-CO')}
                    </td>
                    <td className="py-2">
                      <Badge color="blue">{ev.accion}</Badge>
                    </td>
                    <td className="py-2 text-gray-700">{ev.entidad}</td>
                    <td className="max-w-md truncate py-2 text-gray-500">
                      {ev.detalles ?? '—'}
                    </td>
                    <td className="py-2 text-gray-500">{ev.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
