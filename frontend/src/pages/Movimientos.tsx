import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useReportes } from '../hooks/useReportes';
import {
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

export interface Linea {
  id: string;
  cantidad: number;
  activo: { id: string; codigo: string };
}

export interface Movimiento {
  id: string;
  tipo: string;
  documento: string;
  estado: string;
  fechaEfectiva: string;
  motivoCorreccion?: string | null;
  firmaNombre?: string | null;
  firmaDocumento?: string | null;
  firmaCargo?: string | null;
  cliente?: { nombre: string } | null;
  vehiculo?: { placa: string } | null;
  transportista?: { nombre: string } | null;
  lineas: Linea[];
}

interface ActivoSimple {
  id: string;
  codigo: string;
  estadoLogistico: string;
  estadoOperativo: string;
}

interface ClienteSimple {
  id: string;
  nombre: string;
}

const tiposMovimiento = [
  'ENTRADA',
  'SALIDA',
  'TRASLADO',
  'DEVOLUCION',
  'PRESTAMO',
  'PERDIDA',
  'DANIO',
  'REPARACION',
];

export default function Movimientos() {
  const { exportarMovimientosPDF, exportarKardexPDF } = useReportes();
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [firmaMovimiento, setFirmaMovimiento] = useState<Movimiento | null>(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setMovimientos(await api<Movimiento[]>('/movimientos'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function confirmar(id: string, firma?: { nombre: string; documento: string; cargo: string }) {
    setError('');
    setMensaje('');
    try {
      const mov = await api<Movimiento>(`/movimientos/${id}/confirmar`, {
        method: 'POST',
        body: firma ? { firma } : {},
      });
      setMensaje(
        `Movimiento confirmado con documento ${mov.documento}` +
          (mov.firmaNombre ? ` · Firma: ${mov.firmaNombre} (${mov.firmaCargo})` : ''),
      );
      setFirmaMovimiento(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar');
    }
  }

  function solicitarConfirmacion(m: Movimiento) {
    const requiereFirma = m.tipo === 'SALIDA' || m.tipo === 'PRESTAMO' || m.tipo === 'DEVOLUCION';
    if (requiereFirma) {
      setFirmaMovimiento(m);
    } else {
      confirmar(m.id);
    }
  }

  async function revertir(id: string) {
    const motivo = window.prompt('Motivo de la reversión (obligatorio, queda auditado):');
    if (!motivo) return;
    setError('');
    setMensaje('');
    try {
      const rev = await api<Movimiento>(`/movimientos/${id}/revertir`, {
        method: 'POST',
        body: { motivo },
      });
      setMensaje(`Reversión registrada con documento ${rev.documento}`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revertir');
    }
  }

  return (
    <>
      <PageHeader
        title="Operaciones / Kardex"
        subtitle="Movimientos con numeración consecutiva y asientos inmutables"
                actions={
            <>
              <Button
                variant="secondary"
                onClick={() => movimientos && exportarMovimientosPDF(movimientos)}
                disabled={!movimientos || movimientos.length === 0}
                title="Exportar movimientos a PDF"
              >
                📄 Movimientos PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => movimientos && exportarKardexPDF(movimientos)}
                disabled={!movimientos || movimientos.length === 0}
                title="Exportar kardex a PDF"
              >
                📄 Kardex PDF
              </Button>
              <Button onClick={() => setModalAbierto(true)}>+ Nuevo movimiento</Button>
            </>
          }
      />

      <ErrorAlert message={error} />
      {mensaje && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      <Card>
        {!movimientos ? (
          <Spinner label="Cargando movimientos…" />
        ) : movimientos.length === 0 ? (
          <EmptyState message="Aún no hay movimientos registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Documento</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Fecha efectiva</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Activos</th>
                  <th className="py-2 pr-4">Despacho</th>
                  <th className="py-2 pr-4">Firma</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{m.documento}</td>
                    <td className="py-2.5 pr-4"><BadgeEstado value={m.tipo} /></td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {new Date(m.fechaEfectiva).toLocaleString('es-CO')}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">{m.cliente?.nombre ?? '—'}</td>
                    <td className="py-2.5 pr-4">{m.lineas.length}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">
                      {m.vehiculo?.placa || m.transportista?.nombre
                        ? [m.vehiculo?.placa, m.transportista?.nombre].filter(Boolean).join(' · ')
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {m.firmaNombre ? (
                        <span className="text-xs">
                          {m.firmaNombre}
                          <span className="block text-gray-400">{m.firmaCargo}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 pr-4"><BadgeEstado value={m.estado} /></td>
                    <td className="py-2.5 pr-4 text-right">
                      {m.estado === 'BORRADOR' && (
                          <Button variant="secondary" onClick={() => solicitarConfirmacion(m)}>
                            Confirmar
                          </Button>
                        )}
                      {m.estado === 'CONFIRMADO' && m.tipo !== 'REVERSION' && (
                        <Button variant="danger" onClick={() => revertir(m.id)}>
                          Revertir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CrearMovimientoModal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onCreado={() => {
          setModalAbierto(false);
          cargar();
        }}
      />

      {firmaMovimiento && (
        <FirmaModal
          movimiento={firmaMovimiento}
          onClose={() => setFirmaMovimiento(null)}
          onFirmar={(firma) => confirmar(firmaMovimiento.id, firma)}
        />
      )}
    </>
  );
}

function FirmaModal({
  movimiento,
  onClose,
  onFirmar,
}: {
  movimiento: Movimiento;
  onClose: () => void;
  onFirmar: (firma: { nombre: string; documento: string; cargo: string }) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [cargo, setCargo] = useState('');
  const [error, setError] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !documento.trim() || !cargo.trim()) {
      setError('Nombre, documento y cargo son obligatorios');
      return;
    }
    setError('');
    onFirmar({ nombre, documento, cargo });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Firma electrónica — ${movimiento.tipo.replaceAll('_', ' ')}`}
    >
      <form onSubmit={onSubmit}>
        <ErrorAlert message={error} />
        <div className="space-y-4">
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Documento: <strong>{movimiento.documento}</strong> · La firma queda
            registrada con fecha/hora del dispositivo y es auditada. Sin GPS ni
            fotografía (V1).
          </p>
          <Field label="Nombre completo">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Field>
          <Field label="Documento de identidad">
            <Input value={documento} onChange={(e) => setDocumento(e.target.value)} required />
          </Field>
          <Field label="Cargo">
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} required />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Firmar y confirmar</Button>
        </div>
      </form>
    </Modal>
  );
}

function CrearMovimientoModal({
  abierto,
  onClose,
  onCreado,
}: {
  abierto: boolean;
  onClose: () => void;
  onCreado: () => void;
}) {
  const [tipo, setTipo] = useState('ENTRADA');
  const [clienteId, setClienteId] = useState('');
  const [clientes, setClientes] = useState<ClienteSimple[]>([]);
  const [activos, setActivos] = useState<ActivoSimple[]>([]);
  const [activoId, setActivoId] = useState('');
  const [lineas, setLineas] = useState<string[]>([]);
  const [vehiculoId, setVehiculoId] = useState('');
  const [transportistaId, setTransportistaId] = useState('');
  const [vehiculos, setVehiculos] = useState<{ id: string; placa: string }[]>([]);
  const [transportistas, setTransportistas] = useState<{ id: string; nombre: string }[]>([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const requiereCliente = tipo === 'SALIDA' || tipo === 'PRESTAMO';
  const usaTransporte = ['SALIDA', 'PRESTAMO', 'DEVOLUCION', 'TRASLADO'].includes(tipo);

  useEffect(() => {
    if (!abierto) return;
    api<ClienteSimple[]>('/clientes').then(setClientes).catch(() => setClientes([]));
    api<ActivoSimple[]>('/activos').then(setActivos).catch(() => setActivos([]));
    // Vehículos/transportistas: requieren permiso transportes:read; si el rol
    // no lo tiene (p. ej. OPERADOR), los campos quedan vacíos sin romper el flujo.
    api<{ id: string; placa: string }[]>('/transportes/vehiculos')
      .then(setVehiculos)
      .catch(() => setVehiculos([]));
    api<{ id: string; nombre: string }[]>('/transportes/transportistas')
      .then(setTransportistas)
      .catch(() => setTransportistas([]));
  }, [abierto]);

  useEffect(() => {
    setClienteId('');
    setLineas([]);
    setVehiculoId('');
    setTransportistaId('');
  }, [tipo]);

  function agregarLinea() {
    if (!activoId) return;
    if (lineas.includes(activoId)) {
      setError('Ese activo ya está en el movimiento');
      return;
    }
    setError('');
    setLineas([...lineas, activoId]);
    setActivoId('');
  }

  function quitarLinea(id: string) {
    setLineas(lineas.filter((l) => l !== id));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lineas.length === 0) {
      setError('Agrega al menos un activo al movimiento');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      await api('/movimientos', {
        method: 'POST',
        body: {
          tipo,
          clienteId: requiereCliente ? clienteId : undefined,
          vehiculoId: usaTransporte && vehiculoId ? vehiculoId : undefined,
          transportistaId: usaTransporte && transportistaId ? transportistaId : undefined,
          lineas: lineas.map((id) => ({ activoId: id, cantidad: 1 })),
        },
      });
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el movimiento');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={abierto} title="Nuevo movimiento (borrador)" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <ErrorAlert message={error} />
        <div className="space-y-4">
          <Field label="Tipo de movimiento">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {tiposMovimiento.map((t) => (
                <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
              ))}
            </Select>
          </Field>

          {requiereCliente && (
            <Field label="Cliente destino">
              <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                <option value="">Selecciona un cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Select>
            </Field>
          )}

          {usaTransporte && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehículo (opcional)">
                <Select value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
                  <option value="">Sin vehículo</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>{v.placa}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Transportista (opcional)">
                <Select value={transportistaId} onChange={(e) => setTransportistaId(e.target.value)}>
                  <option value="">Sin transportista</option>
                  {transportistas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {tipo === 'DEVOLUCION' && (
            <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
              La devolución requiere que el activo esté en estado EN_CLIENTE.
            </p>
          )}

          <div className="rounded-md border border-gray-200 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Activos</p>
            <div className="flex gap-2">
              <Select value={activoId} onChange={(e) => setActivoId(e.target.value)}>
                <option value="">Selecciona un activo…</option>
                {activos
                  .filter((a) => !lineas.includes(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo} · {a.estadoLogistico}
                    </option>
                  ))}
              </Select>
              <Button type="button" variant="secondary" onClick={agregarLinea}>
                Agregar
              </Button>
            </div>
            {lineas.length > 0 && (
              <ul className="mt-3 divide-y divide-gray-100">
                {lineas.map((id) => {
                  const a = activos.find((x) => x.id === id);
                  return (
                    <li key={id} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-medium text-gray-900">{a?.codigo ?? id}</span>
                      <button
                        type="button"
                        onClick={() => quitarLinea(id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear borrador'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
