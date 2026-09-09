import { useEffect, Fragment, useState } from 'react';
import { api } from '../lib/api';
import { useReportes } from '../hooks/useReportes';
import { Button, Card, EmptyState, ErrorAlert, Field, Input, Select, Spinner } from '../components/ui';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface ClienteFacturable {
  id: string;
  nombre: string;
  tarifaDiaria: number;
  activo: boolean;
}

interface LiquidacionDetalleExcel {
  id: string;
  plataformaNombre: string;
  fecha: string;
  entregadas: number;
  devueltas: number;
  saldoDiario: number;
  cobroDiario: number;
}

interface LiquidacionExcel {
  id: string;
  anio: number;
  mes: number;
  estibasDia: number;
  cobro: number;
  estado: string;
  clienteFact?: { nombre: string };
  detalles?: LiquidacionDetalleExcel[];
}

interface CobroGenerado {
  anio: number | string;
  mes: string;
  plataformas: string[];
  totales: { estibasDia: number; cobro: number };
  detalle: Array<{
    cliente: string;
    estibasDia: number;
    tarifaDiaria: number;
    cobro: number;
    plataformasConMovimiento: string[];
  }>;
}

interface PeriodoHistorial {
  anio: number;
  mes: number;
  clientes: number;
  totalCobro: number;
  totalEstibasDia: number;
  cerradas: number;
  abiertas: number;
}

interface CierreIngreso {
  id: string;
  anio: number;
  mes: number;
  diaLimite: number;
  estado: string;
  cerradoAt?: string | null;
}

function contarPlataformas(detalles?: LiquidacionDetalleExcel[]) {
  if (!detalles) return 0;
  return new Set(detalles.filter((d) => d.entregadas > 0 || d.devueltas > 0).map((d) => d.plataformaNombre)).size;
}

export default function CobrosExcel() {
  const { exportarLiquidacionCobrosPDF } = useReportes();
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [clientesFact, setClientesFact] = useState<ClienteFacturable[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionExcel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [expandida, setExpandida] = useState<string | null>(null);
  const [historial, setHistorial] = useState<PeriodoHistorial[]>([]);
  const [cierre, setCierre] = useState<CierreIngreso | null>(null);
  const [diaLimite, setDiaLimite] = useState('2');

  const mesCerrado = liquidaciones.length > 0 && liquidaciones.every((l) => l.estado === 'CERRADA');

  async function recargar(anioSel: string, mesSel: string) {
    const [cf, liq, historialData, cierreData] = await Promise.all([
      api<ClienteFacturable[]>('/economico/clientes-facturables'),
      api<LiquidacionExcel[]>(`/economico/cobros/${anioSel}/${mesSel}`),
      api<PeriodoHistorial[]>('/economico/historial'),
      api<CierreIngreso>(`/economico/cierre-ingreso/${anioSel}/${mesSel}`),
    ]);
    setClientesFact(cf);
    setLiquidaciones(liq);
    setHistorial(Array.isArray(historialData) ? historialData : []);
    setCierre(cierreData);
    setDiaLimite(String(cierreData.diaLimite));
  }

  async function guardarDiaLimite() {
    try {
      const actualizado = await api<CierreIngreso>(`/economico/cierre-ingreso/${anio}/${mes}`, {
        method: 'PUT', body: { diaLimite: Number(diaLimite) },
      });
      setCierre(actualizado);
      setMensaje(`Plazo configurado hasta el día ${actualizado.diaLimite} del mes siguiente.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo configurar el plazo');
    }
  }

  async function cerrarIngreso() {
    if (!window.confirm(`¿Cerrar el ingreso de información de ${MESES[Number(mes) - 1]} ${anio}? Los registros posteriores conservarán su operación, pero no entrarán al cobro.`)) return;
    try {
      const cerrado = await api<CierreIngreso>(`/economico/cierre-ingreso/${anio}/${mes}/cerrar`, { method: 'POST' });
      setCierre(cerrado);
      setMensaje('Ingreso mensual cerrado. Los registros tardíos quedan fuera de contabilización.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar el ingreso');
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await recargar(anio, mes);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar cobros por plataforma');
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generarCobro() {
    setProcesando(true);
    setError('');
    setMensaje('');
    try {
      const res = await api<CobroGenerado>('/economico/generar-cobro', {
        method: 'POST',
        body: { anio: Number(anio), mes: Number(mes) },
      });
      setMensaje(
        `Cobro generado: ${res.totales.estibasDia.toLocaleString('es-CO')} estibas-día · Total a facturar $${res.totales.cobro.toLocaleString('es-CO')}`,
      );
      await recargar(anio, mes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar el cobro');
    } finally {
      setProcesando(false);
    }
  }

  async function cerrarMes() {
    if (!window.confirm(`¿Cerrar definitivamente el mes ${MESES[Number(mes) - 1]} ${anio}? Los valores quedarán protegidos contra regeneración.`)) {
      return;
    }
    setProcesando(true);
    setError('');
    setMensaje('');
    try {
      const res = await api<{ cerradas: number }>(`/economico/cobros/${Number(anio)}/${Number(mes)}/cerrar`, {
        method: 'POST',
      });
      setMensaje(`Mes cerrado: ${res.cerradas} liquidaciones protegidas contra cambios.`);
      await recargar(anio, mes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar el mes');
    } finally {
      setProcesando(false);
    }
  }

  function seleccionarPeriodo(p: PeriodoHistorial) {
    setAnio(String(p.anio));
    setMes(String(p.mes));
    setExpandida(null);
    setCargando(true);
    recargar(String(p.anio), String(p.mes))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar el periodo'))
      .finally(() => setCargando(false));
  }

  function exportarHistorialCSV() {
    if (historial.length === 0) return;
    const filas: string[][] = [
      ['ICOLTRANS - ESTIBAX', 'Historial de periodos liquidados'],
      [`Generado el: ${new Date().toLocaleString('es-CO')}`],
      [],
      ['Periodo', 'Clientes', 'Estibas-dia', 'Total cobro (COP)', 'Liquidaciones cerradas', 'Liquidaciones abiertas'],
      ...historial.map((p) => [
        `${String(p.mes).padStart(2, '0')}/${p.anio}`,
        String(p.clientes),
        String(p.totalEstibasDia),
        String(p.totalCobro),
        String(p.cerradas),
        String(p.abiertas),
      ]),
    ];
    const escapar = (v: string) => (/[",;\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
    const contenido = '\uFEFF' + filas.map((f) => f.map(escapar).join(',')).join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historial-liquidaciones.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarCSV() {
    if (liquidaciones.length === 0) return;
    const filas: string[][] = [
      ['ICOLTRANS - ESTIBAX', `Cobros de ${MESES[Number(mes) - 1]} ${anio}`],
      [],
      ['RESUMEN POR CLIENTE'],
      ['Cliente', 'Estibas-dia', 'Tarifa diaria (COP)', 'Cobro del mes (COP)'],
      ...liquidaciones.map((l) => [
        l.clienteFact?.nombre ?? '—',
        String(l.estibasDia),
        String(clientesFact.find((c) => c.nombre === l.clienteFact?.nombre)?.tarifaDiaria ?? 0),
        String(Number(l.cobro)),
      ]),
      [],
      ['TOTAL', String(totalEstibasDia), '', String(totalCobro)],
      [],
      ['DETALLE DIARIO'],
      ['Cliente', 'Fecha', 'Plataforma', 'Entregadas', 'Devueltas', 'Saldo del dia', 'Cobro del dia (COP)'],
      ...liquidaciones.flatMap((l) =>
        (l.detalles ?? []).map((d) => [
          l.clienteFact?.nombre ?? '—',
          new Date(d.fecha).toLocaleDateString('es-CO'),
          d.plataformaNombre,
          String(d.entregadas),
          String(d.devueltas),
          String(d.saldoDiario),
          String(d.saldoDiario * Number(d.cobroDiario)),
        ]),
      ),
    ];
    const escapar = (v: string) => (/[",;\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
    const contenido = '\uFEFF' + filas.map((f) => f.map(escapar).join(',')).join('\r\n');
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cobros-${anio}-${mes.padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalCobro = liquidaciones.reduce((a, l) => a + Number(l.cobro), 0);
  const totalEstibasDia = liquidaciones.reduce((a, l) => a + l.estibasDia, 0);

  return (
    <div className="mt-6">
      <Card title="Cobros por plataforma (algoritmo Excel)">
        <p className="mb-4 text-sm text-gray-500">
          Saldo del día = saldo anterior + entregadas − devueltas · Cobro del mes = Σ (saldo diario × tarifa diaria)
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <Field label="Año">
              <Input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
            </Field>
          </div>
          <div className="w-44">
            <Field label="Mes">
              <Select value={mes} onChange={(e) => setMes(e.target.value)}>
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button onClick={generarCobro} disabled={procesando}>
            {procesando ? 'Generando…' : '⚙ Generar cobro'}
          </Button>
          <Button variant="secondary" onClick={exportarCSV} disabled={liquidaciones.length === 0}>
            ⬇ Exportar Excel (CSV)
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportarLiquidacionCobrosPDF(liquidaciones, Number(anio), Number(mes))}
            disabled={liquidaciones.length === 0}
          >
            📄 Liquidación PDF
          </Button>
          <Button
            variant="secondary"
            onClick={cerrarMes}
            disabled={liquidaciones.length === 0 || mesCerrado || procesando}
            title={mesCerrado ? 'Este mes ya está cerrado y protegido' : 'Cerrar el mes (protege contra regeneración)'}
          >
            {mesCerrado ? '🔒 Mes cerrado' : '🔒 Cerrar mes'}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl2 border border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Cierre de ingreso</p>
            <p className="mt-1 text-xs text-amber-700">El registro operativo continúa; después del plazo no entra al cobro.</p>
          </div>
          <Field label="Día límite del mes siguiente">
            <Input type="number" min="1" max="10" value={diaLimite} onChange={(e) => setDiaLimite(e.target.value)} disabled={cierre?.estado === 'CERRADO'} />
          </Field>
          <Button variant="secondary" onClick={guardarDiaLimite} disabled={cierre?.estado === 'CERRADO'}>Guardar plazo</Button>
          <Button variant="danger" onClick={cerrarIngreso} disabled={cierre?.estado === 'CERRADO'}>{cierre?.estado === 'CERRADO' ? 'Ingreso cerrado' : 'Cerrar ingreso'}</Button>
          <span className="text-xs text-amber-800">{cierre?.estado === 'CERRADO' ? 'CERRADO' : `Abierto · día ${cierre?.diaLimite ?? diaLimite}`}</span>
        </div>
        {mesCerrado && (
          <p className="mt-3 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            Este periodo está <strong>cerrado</strong>: los valores son definitivos y no se
            regenerarán aunque cambien los movimientos.
          </p>
        )}

        <ErrorAlert message={error} />
        {mensaje && (
          <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="mt-4"><Spinner label="Cargando liquidaciones…" /></div>
        ) : liquidaciones.length === 0 ? (
          <div className="mt-4">
            <EmptyState message={`Aún no hay cobros generados para ${MESES[Number(mes) - 1]} ${anio}. Usa el botón "Generar cobro".`} />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">Clientes facturables</p>
                <p className="text-2xl font-semibold text-gray-900">{liquidaciones.length}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-500">Estibas-día del mes</p>
                <p className="text-2xl font-semibold text-gray-900">{totalEstibasDia.toLocaleString('es-CO')}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-xs uppercase text-green-600">Total a facturar</p>
                <p className="text-2xl font-semibold text-green-700">
                  ${totalCobro.toLocaleString('es-CO')}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2 text-right">Estibas-día</th>
                    <th className="pb-2 text-right">Tarifa diaria</th>
                    <th className="pb-2 text-right">Cobro del mes</th>
                    <th className="pb-2">Plataformas con mov.</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {liquidaciones.map((l) => (
                    <Fragment key={l.id}>
                      <tr>
                        <td className="py-2 font-medium text-gray-900">
                          {l.clienteFact?.nombre ?? '—'}
                        </td>
                        <td className="py-2 text-right text-gray-700">
                          {l.estibasDia.toLocaleString('es-CO')}
                        </td>
                        <td className="py-2 text-right text-gray-700">
                          ${(clientesFact.find((c) => c.nombre === l.clienteFact?.nombre)?.tarifaDiaria ?? 0).toLocaleString('es-CO')}
                        </td>
                        <td className="py-2 text-right font-semibold text-green-700">
                          ${Number(l.cobro).toLocaleString('es-CO')}
                        </td>
                        <td className="py-2 text-gray-500">
                          {contarPlataformas(l.detalles) || '—'}
                        </td>
                        <td className="py-2">
                          {l.estado === 'CERRADA' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                              🔒 CERRADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              ABIERTA
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <Button variant="secondary" onClick={() => setExpandida(expandida === l.id ? null : l.id)}>
                            {expandida === l.id ? 'Ocultar detalle' : 'Ver detalle'}
                          </Button>
                        </td>
                      </tr>
                      {expandida === l.id && l.detalles && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50 p-3">
                            <p className="mb-2 text-xs uppercase text-gray-500">
                              Detalle diario · {l.clienteFact?.nombre} · {MESES[Number(mes) - 1]} {anio}
                            </p>
                            <div className="max-h-72 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-gray-500">
                                    <th className="pb-1">Fecha</th>
                                    <th className="pb-1">Plataforma</th>
                                    <th className="pb-1 text-right">Entregadas</th>
                                    <th className="pb-1 text-right">Devueltas</th>
                                    <th className="pb-1 text-right">Saldo del día</th>
                                    <th className="pb-1 text-right">Cobro día</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {l.detalles
                                    .slice()
                                    .sort((a, b) => (a.plataformaNombre + a.fecha).localeCompare(b.plataformaNombre + b.fecha))
                                    .map((d) => (
                                      <tr key={d.id} className={d.entregadas > 0 || d.devueltas > 0 ? 'bg-yellow-50/60' : ''}>
                                        <td className="py-1 text-gray-700">{new Date(d.fecha).toLocaleDateString('es-CO')}</td>
                                        <td className="py-1 text-gray-700">{d.plataformaNombre}</td>
                                        <td className="py-1 text-right text-gray-700">{d.entregadas || ''}</td>
                                        <td className="py-1 text-right text-gray-700">{d.devueltas || ''}</td>
                                        <td className="py-1 text-right font-medium text-gray-900">{d.saldoDiario}</td>
                                        <td className="py-1 text-right text-gray-500">
                                          ${(d.saldoDiario * Number(d.cobroDiario)).toLocaleString('es-CO')}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <div className="mt-6">
        <Card title={`Historial de periodos liquidados (${historial.length})`}>
          <div className="mb-3 flex justify-end">
            <Button variant="secondary" onClick={exportarHistorialCSV} disabled={historial.length === 0}>
              ⬇ Exportar historial (CSV)
            </Button>
          </div>
          {historial.length === 0 ? (
            <EmptyState message="Aún no hay periodos liquidados. Genera el cobro de un mes para verlo aquí." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500">
                    <th className="pb-2">Periodo</th>
                    <th className="pb-2 text-right">Clientes</th>
                    <th className="pb-2 text-right">Estibas-día</th>
                    <th className="pb-2 text-right">Total cobro</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historial.map((p) => {
                    const activo =
                      Number(anio) === p.anio && Number(mes) === p.mes;
                    const todoCerrado = p.abiertas === 0 && p.cerradas > 0;
                    return (
                      <tr key={`${p.anio}-${p.mes}`} className={activo ? 'bg-green-50/60' : ''}>
                        <td className="py-2 font-medium text-gray-900">
                          {p.mes.toString().padStart(2, '0')}/{p.anio}
                        </td>
                        <td className="py-2 text-right text-gray-700">{p.clientes}</td>
                        <td className="py-2 text-right text-gray-700">
                          {p.totalEstibasDia.toLocaleString('es-CO')}
                        </td>
                        <td className="py-2 text-right font-semibold text-gray-900">
                          ${p.totalCobro.toLocaleString('es-CO')}
                        </td>
                        <td className="py-2">
                          {todoCerrado ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                              🔒 Cerrado ({p.cerradas})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Parcial ({p.cerradas}/{p.clientes} cerradas)
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            variant="secondary"
                            onClick={() => seleccionarPeriodo(p)}
                            disabled={activo}
                          >
                            {activo ? '✓ Cargado' : 'Ver'}
                          </Button>
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
    </div>
  );
}