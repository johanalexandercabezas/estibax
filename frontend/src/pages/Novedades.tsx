import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import {
  Badge,
  BadgeEstado,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
} from '../components/ui';

interface ActivoSimple {
  id: string;
  codigo: string;
  estadoFisico: string;
  estadoLogistico: string;
  estadoOperativo: string;
}

interface Novedad {
  id: string;
  estado: string;
  disposicion: string | null;
  descripcion: string;
  fecha: string;
  causa: string | null;
  responsable: string | null;
  reparacion: number | null;
  activo: {
    id: string;
    codigo: string;
    estadoFisico: string;
    estadoLogistico: string;
    estadoOperativo: string;
  };
  cliente: { nombre: string } | null;
}

const colorEstado: Record<string, string> = {
  ABIERTA: 'red',
  EN_INVESTIGACION: 'yellow',
  EN_REPARACION: 'orange',
  CERRADA: 'green',
};

const colorDisposicion: Record<string, string> = {
  REPARACION: 'blue',
  INDEMNIZACION: 'orange',
  BAJA: 'red',
  SIN_ACCION: 'gray',
};

export default function Novedades() {
  const [novedades, setNovedades] = useState<Novedad[] | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [investigarId, setInvestigarId] = useState<string | null>(null);
  const [resolverId, setResolverId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setNovedades(await api<Novedad[]>('/novedades'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar novedades');
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function completarReparacion(id: string) {
    setError('');
    setMensaje('');
    try {
      const res = await api<Novedad>(`/novedades/${id}/completar-reparacion`, {
        method: 'POST',
      });
      setMensaje(
        `Inspección humana registrada: activo ${res.activo.codigo} liberado (BUENO / DISPONIBLE)`,
      );
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar reparación');
    }
  }

  return (
    <>
      <PageHeader
        title="Novedades e Investigación"
        subtitle="Expediente de daños, pérdidas y su resolución con inspección humana"
        actions={<Button onClick={() => setCrearAbierto(true)}>+ Reportar novedad</Button>}
      />

      <ErrorAlert message={error} />
      {mensaje && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      <Card>
        {!novedades ? (
          <Spinner label="Cargando novedades…" />
        ) : novedades.length === 0 ? (
          <EmptyState message="No hay novedades registradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Activo</th>
                  <th className="py-2 pr-4">Descripción</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Disposición</th>
                  <th className="py-2 pr-4">Causa</th>
                  <th className="py-2 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {novedades.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {n.activo.codigo}
                      <div className="text-xs text-gray-400">
                        <BadgeEstado value={n.activo.estadoFisico} />
                        {' · '}
                        <BadgeEstado value={n.activo.estadoOperativo} />
                      </div>
                    </td>
                    <td className="max-w-xs py-2.5 pr-4 text-gray-600">
                      {n.descripcion}
                      {n.responsable && (
                        <div className="text-xs text-gray-400">
                          Responsable: {n.responsable}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {n.cliente?.nombre ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge color={colorEstado[n.estado] ?? 'gray'}>
                        {n.estado.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      {n.disposicion ? (
                        <Badge color={colorDisposicion[n.disposicion] ?? 'gray'}>
                          {n.disposicion}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="max-w-xs py-2.5 pr-4 text-gray-500">
                      {n.causa ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {n.estado !== 'CERRADA' && (
                          <>
                            {n.disposicion !== 'REPARACION' &&
                              n.estado !== 'EN_INVESTIGACION' && (
                                <Button
                                  variant="secondary"
                                  className="px-2 py-1"
                                  onClick={() => setInvestigarId(n.id)}
                                >
                                  Investigar
                                </Button>
                              )}
                            <Button
                              variant="secondary"
                              className="px-2 py-1"
                              onClick={() => setResolverId(n.id)}
                            >
                              Resolver
                            </Button>
                          </>
                        )}
                        {n.disposicion === 'REPARACION' && n.estado !== 'CERRADA' && (
                          <Button
                            variant="primary"
                            className="px-2 py-1"
                            onClick={() => completarReparacion(n.id)}
                          >
                            Inspección
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CrearNovedadModal
        abierto={crearAbierto}
        onClose={() => setCrearAbierto(false)}
        onCreado={() => {
          setCrearAbierto(false);
          cargar();
        }}
      />

      {investigarId && (
        <InvestigarModal
          novedadId={investigarId}
          onClose={() => setInvestigarId(null)}
          onListo={() => {
            setInvestigarId(null);
            cargar();
          }}
        />
      )}

      {resolverId && (
        <ResolverModal
          novedadId={resolverId}
          onClose={() => setResolverId(null)}
          onListo={() => {
            setResolverId(null);
            cargar();
          }}
        />
      )}
    </>
  );
}

function CrearNovedadModal({
  abierto,
  onClose,
  onCreado,
}: {
  abierto: boolean;
  onClose: () => void;
  onCreado: () => void;
}) {
  const [activos, setActivos] = useState<ActivoSimple[]>([]);
  const [activoId, setActivoId] = useState('');
  const [estadoFisico, setEstadoFisico] = useState('DANADO');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      api<ActivoSimple[]>('/activos')
        .then(setActivos)
        .catch(() => setActivos([]));
    }
  }, [abierto]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api('/novedades', {
        method: 'POST',
        body: {
          activoId,
          estadoFisico,
          descripcion,
        },
      });
      setActivoId('');
      setDescripcion('');
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reportar novedad');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={abierto} title="Reportar daño / novedad" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <ErrorAlert message={error} />
        <div className="space-y-4">
          <Field label="Activo afectado">
            <Select value={activoId} onChange={(e) => setActivoId(e.target.value)} required>
              <option value="">Selecciona un activo…</option>
              {activos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} · {a.estadoFisico} · {a.estadoOperativo}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severidad">
            <Select value={estadoFisico} onChange={(e) => setEstadoFisico(e.target.value)}>
              <option value="DANADO">Dañado</option>
              <option value="CRITICO">Crítico</option>
            </Select>
          </Field>
          <Field label="Descripción">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              required
              className="block w-full rounded-md border-0 px-3 py-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600"
            />
          </Field>
          <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            Al reportar el daño, el activo quedará BLOQUEADO automáticamente
            (regla de negocio 7.6) y no podrá despacharse hasta resolver la novedad.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Reportar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function InvestigarModal({
  novedadId,
  onClose,
  onListo,
}: {
  novedadId: string;
  onClose: () => void;
  onListo: () => void;
}) {
  const [causa, setCausa] = useState('');
  const [responsable, setResponsable] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api(`/novedades/${novedadId}/investigar`, {
        method: 'POST',
        body: { causa, responsable },
      });
      onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar investigación');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar investigación">
      <form onSubmit={onSubmit}>
        <ErrorAlert message={error} />
        <div className="space-y-4">
          <Field label="Causa identificada">
            <Input value={causa} onChange={(e) => setCausa(e.target.value)} required />
          </Field>
          <Field label="Responsable">
            <Input
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar investigación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResolverModal({
  novedadId,
  onClose,
  onListo,
}: {
  novedadId: string;
  onClose: () => void;
  onListo: () => void;
}) {
  const [disposicion, setDisposicion] = useState('REPARACION');
  const [valor, setValor] = useState('');
  const [indemnizacion, setIndemnizacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api(`/novedades/${novedadId}/resolver`, {
        method: 'POST',
        body: {
          disposicion,
          valor: valor ? Number(valor) : undefined,
          indemnizacion: indemnizacion ? Number(indemnizacion) : undefined,
        },
      });
      onListo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al resolver novedad');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Resolver novedad">
      <form onSubmit={onSubmit}>
        <ErrorAlert message={error} />
        <div className="space-y-4">
          <Field label="Disposición">
            <Select value={disposicion} onChange={(e) => setDisposicion(e.target.value)}>
              <option value="REPARACION">Reparación</option>
              <option value="INDEMNIZACION">Indemnización</option>
              <option value="BAJA">Baja</option>
            </Select>
          </Field>
          <Field label="Valor de reposición (base)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </Field>
          {disposicion === 'INDEMNIZACION' && (
            <Field label="Monto de indemnización">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={indemnizacion}
                onChange={(e) => setIndemnizacion(e.target.value)}
                required
              />
            </Field>
          )}
          {disposicion === 'REPARACION' && (
            <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
              Al resolver a REPARACIÓN, el activo pasa a EN_REPARACION y permanece
              bloqueado hasta que un humano autorizado complete la inspección.
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Resolver'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}