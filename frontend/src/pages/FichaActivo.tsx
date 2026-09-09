import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, DownloadSimple, Printer } from '@phosphor-icons/react';
import { api } from '../lib/api';
import {
  Badge,
  BadgeEstado,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  PageHeader,
  Spinner,
} from '../components/ui';

interface Movimiento {
  id: string;
  documento: string;
  tipo: string;
  fechaEfectiva: string;
  estado: string;
  cliente?: { nombre: string } | null;
}

interface Novedad {
  id: string;
  fecha: string;
  descripcion: string;
  estado: string;
  disposicion: string;
}

interface Ficha {
  id: string;
  codigo: string;
  propiedad: string;
  valorAdquisicion: string | number | null;
  valorReposicion: string | number | null;
  estadoFisico: string;
  estadoLogistico: string;
  estadoOperativo: string;
  createdAt: string;
  tipoActivo: { nombre: string } | null;
  cliente: { nombre: string } | null;
  ubicacion: {
    nombre: string;
    bodega?: { nombre: string; planta?: { nombre: string; sede?: { nombre: string } } };
  } | null;
  lineas: { movimiento: Movimiento }[];
  novedades: Novedad[];
}

/** Formatea un valor Decimal de Prisma a moneda. */
function moneda(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return '$ ' + Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

/** Etiqueta QR estándar del activo: ESTIBAX|codigo|id */
function contenidoQR(a: { codigo: string; id: string }): string {
  return `ESTIBAX|${a.codigo}|${a.id}`;
}
export default function FichaActivo() {
  const { id } = useParams<{ id: string }>();
  const [activo, setActivo] = useState<Ficha | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api<Ficha>(`/activos/${id}`)
      .then(async (data) => {
        const dataUrl = await QRCode.toDataURL(contenidoQR(data), {
          width: 260,
          margin: 1,
          color: { dark: '#0F172A', light: '#FFFFFF' },
        });
        setQr(dataUrl);
        setActivo(data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Error al cargar el activo'),
      );
  }, [id]);

  const descargarPNG = useCallback(() => {
    if (!qr || !activo) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = `etiqueta-${activo.codigo}.png`;
    a.click();
  }, [qr, activo]);

  const imprimirEtiqueta = useCallback(() => {
    if (!qr || !activo) return;
    const html =
      '<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Etiqueta ' +
      activo.codigo +
      '</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:24px}img{width:220px;height:220px}.codigo{font-size:20px;font-weight:bold;margin-top:8px}.tipo{font-size:13px;color:#555;margin-top:4px}</style></head><body>' +
      '<img src="' + qr + '" alt="QR" />' +
      '<p class="codigo">' + activo.codigo + '</p>' +
      '<p class="tipo">' + (activo.tipoActivo?.nombre ?? '') + ' · ' + (activo.propiedad ?? '') + '</p>' +
      '</body></html>';
    const w = window.open('', '_blank', 'width=320,height=420');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      // Imprimir tras pintar la imagen
      setTimeout(() => w.print(), 350);
    }
  }, [qr, activo]);

  const rutaUbicacion = (() => {
    const u = activo?.ubicacion;
    if (!u) return '';
    const partes = [u.bodega?.planta?.sede?.nombre, u.bodega?.planta?.nombre, u.bodega?.nombre, u.nombre].filter(
      (x): x is string => Boolean(x),
    );
    return partes.join(' → ');
  })();
return (
    <>
      <div className="mb-3">
        <Link
          to="/activos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeft size={16} weight="bold" /> Volver a Activos
        </Link>
      </div>

      <PageHeader
        title={`Ficha 360° — ${activo?.codigo ?? '…'}`}
        subtitle="Historial completo, estados y trazabilidad del activo"
        actions={
          <>
            <Button variant="secondary" onClick={imprimirEtiqueta} disabled={!qr}>
              <Printer size={16} weight="bold" className="mr-1.5" /> Imprimir etiqueta
            </Button>
            <Button onClick={descargarPNG} disabled={!qr}>
              <DownloadSimple size={16} weight="bold" className="mr-1.5" /> Descargar QR
            </Button>
          </>
        }
      />

      {error && <ErrorAlert message={error} />}
      {!activo && !error && <Spinner label="Cargando ficha del activo…" />}

      {activo && (
        <>
          {/* Identificación + QR + estados */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Identificación">
              <div className="flex items-center gap-5">
                {qr ? (
                  <img
                    src={qr}
                    alt={`QR de ${activo.codigo}`}
                    className="h-32 w-32 rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="h-32 w-32 animate-pulse rounded-lg bg-gray-100" />
                )}
                <div>
                  <p className="text-2xl font-bold text-ink">{activo.codigo}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <Badge color="green">{activo.tipoActivo?.nombre ?? 'Sin tipo'}</Badge>
                    <BadgeEstado value={activo.propiedad} />
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-500">Registrado</span>
                  <span className="font-medium text-ink">
                    {new Date(activo.createdAt).toLocaleDateString('es-CO')}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Valor adquisición</span>
                  <span className="font-medium text-ink">{moneda(activo.valorAdquisicion)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-500">Valor reposición</span>
                  <span className="font-medium text-ink">{moneda(activo.valorReposicion)}</span>
                </li>
              </ul>
            </Card>

            <Card title="Estados del activo">
              <div className="space-y-3">
                <EstadoFila label="Físico" value={activo.estadoFisico} />
                <EstadoFila label="Logístico" value={activo.estadoLogistico} />
                <EstadoFila label="Operativo" value={activo.estadoOperativo} />
              </div>
            </Card>

            <Card title="Ubicación y custodia">
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between gap-3">
                  <span className="text-gray-500">Ubicación</span>
                  <span className="text-right font-medium text-ink">
                    {rutaUbicacion || 'Sin asignar'}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-gray-500">Custodia</span>
                  <span className="text-right font-medium text-ink">{activo.cliente?.nombre ?? 'Empresa'}</span>
                </li>
              </ul>
            </Card>
          </div>
{/* Movimientos (Kardex del activo) */}
          <div className="mt-6">
            <Card title={`Movimientos (${activo.lineas?.length ?? 0})`}>
              {!activo.lineas || activo.lineas.length === 0 ? (
                <EmptyState message="Este activo aún no tiene movimientos registrados." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2 pr-4">Documento</th>
                        <th className="py-2 pr-4">Tipo</th>
                        <th className="py-2 pr-4">Fecha</th>
                        <th className="py-2 pr-4">Cliente</th>
                        <th className="py-2 pr-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activo.lineas.map((l, idx) => (
                        <tr key={l.movimiento.id + idx} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-4 font-medium text-ink">{l.movimiento.documento}</td>
                          <td className="py-2.5 pr-4">
                            <BadgeEstado value={l.movimiento.tipo} />
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600">
                            {new Date(l.movimiento.fechaEfectiva).toLocaleDateString('es-CO')}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600">{l.movimiento.cliente?.nombre ?? '—'}</td>
                          <td className="py-2.5 pr-4">
                            <BadgeEstado value={l.movimiento.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Novedades del activo */}
          <div className="mt-6">
            <Card title={`Novedades (${activo.novedades?.length ?? 0})`}>
              {!activo.novedades || activo.novedades.length === 0 ? (
                <EmptyState message="Este activo no tiene novedades abiertas ni históricas." />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {activo.novedades.map((n) => (
                    <li key={n.id} className="flex items-start justify-between gap-4 py-2.5">
                      <div>
                        <p className="text-sm text-gray-800">{n.descripcion}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {new Date(n.fecha).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <BadgeEstado value={n.estado} />
                        <BadgeEstado value={n.disposicion} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function EstadoFila({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <BadgeEstado value={value} />
    </div>
  );
}