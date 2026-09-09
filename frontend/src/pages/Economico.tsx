import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import CobrosExcel from './CobrosExcel';
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
  Select,
  Spinner,
} from '../components/ui';

interface Contrato {
  id: string;
  clienteId: string;
  tipo: string;
  fechaInicio: string;
  fechaFin?: string | null;
  tarifas?: Tarifa[];
}

interface Tarifa {
  id: string;
  tipoActivoId: string;
  tipoActivo?: { nombre: string };
  valor: number;
  fechaVigencia: string;
}

interface Liquidacion {
  id: string;
  clienteId: string;
  periodoInicio: string;
  periodoFin: string;
  total: number;
  estado: string;
  createdAt: string;
}

interface ClienteLite {
  id: string;
  nombre: string;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function Economico() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [modalLiquidar, setModalLiquidar] = useState(false);
  const [form, setForm] = useState({
    clienteId: '',
    anio: String(new Date().getFullYear()),
    mes: String(new Date().getMonth() + 1),
  });
  const [procesando, setProcesando] = useState(false);

  async function recargar() {
    const [c, l, cl] = await Promise.all([
      api<Contrato[]>('/economico/contratos'),
      api<Liquidacion[]>('/economico/liquidaciones'),
      api<ClienteLite[]>('/clientes'),
    ]);
    setContratos(c);
    setLiquidaciones(l);
    setClientes(cl);
  }

  useEffect(() => {
    (async () => {
      try {
        await recargar();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar datos económicos');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function generarCobro(contratoId: string) {
    setError('');
    setMensaje('');
    try {
      await api(`/economico/contratos/${contratoId}/cobro-diario`, {
        method: 'POST',
        body: {},
      });
      setMensaje('Cobro diario generado correctamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar el cobro');
    }
  }

  async function liquidar() {
    setProcesando(true);
    setError('');
    setMensaje('');
    try {
      await api('/economico/liquidaciones', {
        method: 'POST',
        body: { clienteId: form.clienteId, anio: Number(form.anio), mes: Number(form.mes) },
      });
      setMensaje('Liquidación mensual generada correctamente.');
      setModalLiquidar(false);
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al liquidar');
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) return <Spinner label="Cargando módulo económico…" />;

  return (
    <div>
      <PageHeader
        title="Cobros y Liquidaciones"
        subtitle="Contratos con tarifas históricas, cobro diario y liquidación mensual"
        actions={<Button onClick={() => setModalLiquidar(true)}>＋ Liquidación mensual</Button>}
      />
      <ErrorAlert message={error} />
      {mensaje && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      <VistaContratos contratos={contratos} clientes={clientes} onCobro={generarCobro} />
      <VistaLiquidaciones liquidaciones={liquidaciones} clientes={clientes} />
      <CobrosExcel />

      <Modal open={modalLiquidar} title="Liquidación mensual" onClose={() => setModalLiquidar(false)}>
        <div className="space-y-4">
          <Field label="Cliente">
            <Select
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
            >
              <option value="">Seleccione un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Año">
              <Input
                type="number"
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: e.target.value })}
              />
            </Field>
            <Field label="Mes">
              <Select value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })}>
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button onClick={liquidar} disabled={procesando || !form.clienteId} className="w-full">
            {procesando ? 'Procesando…' : 'Generar liquidación'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function VistaLiquidaciones({
  liquidaciones,
  clientes,
}: {
  liquidaciones: Liquidacion[];
  clientes: ClienteLite[];
}) {
  return (
    <div className="mt-6">
      <Card title={`Liquidaciones generadas (${liquidaciones.length})`}>
        {liquidaciones.length === 0 ? (
          <EmptyState message="Aún no hay liquidaciones mensuales." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Periodo</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {liquidaciones.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 text-gray-900">
                    {clientes.find((c) => c.id === l.clienteId)?.nombre ?? l.clienteId}
                  </td>
                  <td className="py-2 text-gray-600">
                    {new Date(l.periodoInicio).toLocaleDateString()} –{' '}
                    {new Date(l.periodoFin).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    ${Number(l.total).toLocaleString('es-CO')}
                  </td>
                  <td className="py-2">
                    <Badge color={l.estado === 'CERRADA' ? 'green' : 'yellow'}>{l.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function VistaContratos({
  contratos,
  clientes,
  onCobro,
}: {
  contratos: Contrato[];
  clientes: ClienteLite[];
  onCobro: (id: string) => void;
}) {
  return (
    <Card title={`Contratos con tarifas (${contratos.length})`}>
      {contratos.length === 0 ? (
        <EmptyState message="No hay contratos registrados." />
      ) : (
        <div className="space-y-4">
          {contratos.map((c) => (
            <div key={c.id} className="rounded-md border border-gray-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {clientes.find((cl) => cl.id === c.clienteId)?.nombre ?? c.clienteId}
                  </p>
                  <p className="text-sm text-gray-500">
                    {c.tipo} · Vigente desde {new Date(c.fechaInicio).toLocaleDateString()}
                    {c.fechaFin ? ` hasta ${new Date(c.fechaFin).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => onCobro(c.id)}>
                  Generar cobro de hoy
                </Button>
              </div>
              {c.tarifas && c.tarifas.length > 0 && (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500">
                      <th className="pb-1">Tipo de activo</th>
                      <th className="pb-1">Valor</th>
                      <th className="pb-1">Vigencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {c.tarifas.map((t) => (
                      <tr key={t.id}>
                        <td className="py-1.5 text-gray-700">
                          {t.tipoActivo?.nombre ?? t.tipoActivoId}
                        </td>
                        <td className="py-1.5 font-medium text-gray-900">
                          ${t.valor.toLocaleString('es-CO')}
                        </td>
                        <td className="py-1.5 text-gray-500">
                          {new Date(t.fechaVigencia).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

