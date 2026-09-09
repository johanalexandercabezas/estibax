import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
} from '../components/ui';

interface Reglas {
  puede_recibir_propias: boolean;
  puede_recibir_ercol: boolean;
  puede_recibir_tercero: boolean;
  cantidad_maxima: number;
  requiere_aval: boolean;
}

interface Cliente {
  id: string;
  nombre: string;
  documento: string | null;
  email: string | null;
  telefono?: string | null;
  activo: boolean;
  reglasJson: string;
  _count?: { activosCustodia: number };
}

interface BalanceDevolucion {
  clienteId: string;
  entregadas: number;
  devueltas: number;
  pendientes: number;
  cumple: boolean;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [balances, setBalances] = useState<Record<string, BalanceDevolucion>>({});
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const data = await api<Cliente[]>('/clientes');
      setClientes(data);
      const promesas = data.map(async (c) => {
        try {
          const b = await api<BalanceDevolucion>(
            `/clientes/${c.id}/balance-devoluciones`,
          );
          setBalances((prev) => ({ ...prev, [c.id]: b }));
        } catch {
          // Si falla un balance, se omite
        }
      });
      await Promise.all(promesas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Terceros con reglas de despacho configurables y activos en custodia"
        actions={<Button onClick={() => { setClienteEditando(null); setModalAbierto(true); }}>+ Nuevo cliente</Button>}
      />

      <ErrorAlert message={error} />

      <Card>
        {!clientes ? (
          <Spinner label="Cargando clientes…" />
        ) : clientes.length === 0 ? (
          <EmptyState message="Aún no hay clientes registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">En custodia</th>
                  <th className="py-2 pr-4">Pend. devolución</th>
                  <th className="py-2 pr-4">Reglas de despacho</th>
                  <th className="py-2 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map((c) => {
                  let reglas: Reglas | null = null;
                  try {
                    reglas = JSON.parse(c.reglasJson) as Reglas;
                  } catch {
                    reglas = null;
                  }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{c.nombre}</td>
                      <td className="py-2.5 pr-4 text-gray-500">{c.email ?? '—'}</td>
                      <td className="py-2.5 pr-4">{c._count?.activosCustodia ?? 0}</td>
                      <td className="py-2.5 pr-4">
                        {balances[c.id] ? (
                          balances[c.id].pendientes > 0 ? (
                            <Badge color="red">{balances[c.id].pendientes}</Badge>
                          ) : (
                            <Badge color="green">Saldado</Badge>
                          )
                        ) : (
                          <span className="text-gray-400">…</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Button variant="secondary" onClick={() => { setClienteEditando(c); setModalAbierto(true); }}>Editar</Button>
                      </td>
                      <td className="py-2.5 pr-4">
                        {reglas ? (
                          <div className="flex flex-wrap gap-1">
                            {reglas.puede_recibir_propias && <Badge color="blue">Propias</Badge>}
                            {reglas.puede_recibir_ercol && <Badge color="yellow">ERCOL</Badge>}
                            {reglas.puede_recibir_tercero && <Badge color="gray">Terceros</Badge>}
                            <Badge color="green">Máx {reglas.cantidad_maxima}</Badge>
                            {reglas.requiere_aval && <Badge color="red">Requiere aval</Badge>}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin reglas</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge color={c.activo ? 'green' : 'gray'}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CrearClienteModal
        abierto={modalAbierto}
        cliente={clienteEditando}
        onClose={() => setModalAbierto(false)}
        onCreado={() => {
          setModalAbierto(false);
          setClienteEditando(null);
          cargar();
        }}
      />
    </>
  );
}

function CrearClienteModal({
  abierto,
  cliente,
  onClose,
  onCreado,
}: {
  abierto: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onCreado: () => void;
}) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [telefono, setTelefono] = useState('');
  const [cantidadMaxima, setCantidadMaxima] = useState('100');
  const [puedePropias, setPuedePropias] = useState(true);
  const [puedeErcol, setPuedeErcol] = useState(true);
  const [puedeTercero, setPuedeTercero] = useState(false);
  const [requiereAval, setRequiereAval] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNombre(cliente?.nombre ?? '');
    setDocumento(cliente?.documento ?? '');
    setEmail(cliente?.email ?? '');
    setTelefono(cliente?.telefono ?? '');
    if (cliente) {
      try {
        const reglas = JSON.parse(cliente.reglasJson) as Reglas;
        setCantidadMaxima(String(reglas.cantidad_maxima));
        setPuedePropias(reglas.puede_recibir_propias);
        setPuedeErcol(reglas.puede_recibir_ercol);
        setPuedeTercero(reglas.puede_recibir_tercero);
        setRequiereAval(reglas.requiere_aval);
      } catch {
        // Mantener valores por defecto si las reglas antiguas son invalidas.
      }
    }
  }, [cliente]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const reglas: Reglas = {
        puede_recibir_propias: puedePropias,
        puede_recibir_ercol: puedeErcol,
        puede_recibir_tercero: puedeTercero,
        cantidad_maxima: Number(cantidadMaxima) || 0,
        requiere_aval: requiereAval,
      };
      await api(cliente ? `/clientes/${cliente.id}` : '/clientes', {
        method: cliente ? 'PUT' : 'POST',
        body: {
          nombre,
          documento: documento || undefined,
          email: email || undefined,
          telefono: telefono || undefined,
          reglasJson: JSON.stringify(reglas),
        },
      });
      setNombre('');
      setDocumento('');
      setEmail('');
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el cliente');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={abierto} title={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <ErrorAlert message={error} />
        <div className="space-y-4">
          <Field label="Nombre / Razón social">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Documento (opcional)">
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </Field>
            <Field label="Email (opcional)">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Teléfono de contacto">
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </Field>
          </div>

          <div className="rounded-md border border-gray-200 p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Reglas de despacho</p>
            <div className="space-y-2 text-sm">
              <Check label="Puede recibir estibas propias" checked={puedePropias} onChange={setPuedePropias} />
              <Check label="Puede recibir estibas ERCOL" checked={puedeErcol} onChange={setPuedeErcol} />
              <Check label="Puede recibir estibas de terceros" checked={puedeTercero} onChange={setPuedeTercero} />
              <Check label="Requiere aval (firma de autorización)" checked={requiereAval} onChange={setRequiereAval} />
            </div>
            <div className="mt-3">
              <Field label="Cantidad máxima en custodia">
                <Input
                  type="number"
                  min="0"
                  value={cantidadMaxima}
                  onChange={(e) => setCantidadMaxima(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
      />
      <span className="text-gray-700">{label}</span>
    </label>
  );
}
