import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useSedes } from '../context/SedeContext';
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

interface Activo {
  id: string;
  codigo: string;
  propiedad: string;
  estadoFisico: string;
  estadoLogistico: string;
  estadoOperativo: string;
  tipoActivo: { nombre: string };
  cliente: { nombre: string } | null;
  ubicacion: { nombre: string } | null;
}

interface TipoActivo {
  id: string;
  nombre: string;
}

const filtros = {
  propiedad: ['', 'PROPIA', 'ERCOL', 'TERCERO'],
  estadoFisico: ['', 'BUENO', 'REGULAR', 'DANADO', 'CRITICO'],
  estadoLogistico: [
    '',
    'DISPONIBLE',
    'EN_TRANSITO',
    'EN_CLIENTE',
    'EN_REPARACION',
    'PERDIDA',
    'BAJA',
  ],
  estadoOperativo: ['', 'LIBRE', 'BLOQUEADO'],
};

export default function Activos() {
  const { sedeActiva } = useSedes();
  const [activos, setActivos] = useState<Activo[] | null>(null);
  const [tipos, setTipos] = useState<TipoActivo[]>([]);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const [fPropiedad, setFPropiedad] = useState('');
  const [fEstadoFisico, setFEstadoFisico] = useState('');
  const [fEstadoLogistico, setFEstadoLogistico] = useState('');
  const [fEstadoOperativo, setFEstadoOperativo] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const data = await api<Activo[]>('/activos', {
        params: {
          sedeId: sedeActiva?.id || undefined,
          propiedad: fPropiedad || undefined,
          estadoFisico: fEstadoFisico || undefined,
          estadoLogistico: fEstadoLogistico || undefined,
          estadoOperativo: fEstadoOperativo || undefined,
        },
      });
      setActivos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar activos');
    }
  }, [sedeActiva?.id, fPropiedad, fEstadoFisico, fEstadoLogistico, fEstadoOperativo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    api<TipoActivo[]>('/activos/tipos')
      .then(setTipos)
      .catch(() => setTipos([]));
  }, []);


  async function cambiarBloqueo(id: string, bloquear: boolean) {
    setError('');
    try {
      await api(`/activos/${id}/${bloquear ? 'bloquear' : 'desbloquear'}`, {
        method: 'POST',
      });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar bloqueo');
    }
  }

  return (
    <>
      <PageHeader
        title="Activos"
        subtitle="Estibas identificadas individualmente con sus tres dimensiones de estado"
        actions={<Button onClick={() => setModalAbierto(true)}>+ Registrar activo</Button>}
      />

      <ErrorAlert message={error} />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="Propiedad">
            <Select value={fPropiedad} onChange={(e) => setFPropiedad(e.target.value)}>
              {filtros.propiedad.map((o) => (
                <option key={o} value={o}>{o || 'Todas'}</option>
              ))}
            </Select>
          </Field>
          <Field label="Estado físico">
            <Select value={fEstadoFisico} onChange={(e) => setFEstadoFisico(e.target.value)}>
              {filtros.estadoFisico.map((o) => (
                <option key={o} value={o}>{o || 'Todos'}</option>
              ))}
            </Select>
          </Field>
          <Field label="Estado logístico">
            <Select value={fEstadoLogistico} onChange={(e) => setFEstadoLogistico(e.target.value)}>
              {filtros.estadoLogistico.map((o) => (
                <option key={o} value={o}>{o || 'Todos'}</option>
              ))}
            </Select>
          </Field>
          <Field label="Estado operativo">
            <Select value={fEstadoOperativo} onChange={(e) => setFEstadoOperativo(e.target.value)}>
              {filtros.estadoOperativo.map((o) => (
                <option key={o} value={o}>{o || 'Todos'}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        {!activos ? (
          <Spinner label="Cargando activos…" />
        ) : activos.length === 0 ? (
          <EmptyState message="No hay activos con los filtros seleccionados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Propiedad</th>
                  <th className="py-2 pr-4">Físico</th>
                  <th className="py-2 pr-4">Logístico</th>
                  <th className="py-2 pr-4">Operativo</th>
                  <th className="py-2 pr-4">Custodia</th>
                  <th className="py-2 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activos.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-ink">
                      <Link to={`/activos/${a.id}`} className="hover:text-brand-700 hover:underline">
                        {a.codigo}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">{a.tipoActivo?.nombre}</td>
                    <td className="py-2.5 pr-4"><BadgeEstado value={a.propiedad} /></td>
                    <td className="py-2.5 pr-4"><BadgeEstado value={a.estadoFisico} /></td>
                    <td className="py-2.5 pr-4"><BadgeEstado value={a.estadoLogistico} /></td>
                    <td className="py-2.5 pr-4"><BadgeEstado value={a.estadoOperativo} /></td>
                    <td className="py-2.5 pr-4 text-gray-500">{a.cliente?.nombre ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-right">
                      {a.estadoOperativo === 'BLOQUEADO' ? (
                        <Button variant="secondary" onClick={() => cambiarBloqueo(a.id, false)}>
                          Desbloquear
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={() => cambiarBloqueo(a.id, true)}>
                          Bloquear
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

      <CrearActivoModal
        abierto={modalAbierto}
        tipos={tipos}
        onClose={() => setModalAbierto(false)}
        onCreado={() => {
          setModalAbierto(false);
          cargar();
        }}
      />
    </>
  );
}

function CrearActivoModal({
  abierto,
  tipos,
  onClose,
  onCreado,
}: {
  abierto: boolean;
  tipos: TipoActivo[];
  onClose: () => void;
  onCreado: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [tipoActivoId, setTipoActivoId] = useState('');
  const [propiedad, setPropiedad] = useState('PROPIA');
  const [valorAdquisicion, setValorAdquisicion] = useState('');
  const [valorReposicion, setValorReposicion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api('/activos', {
        method: 'POST',
        body: {
          codigo,
          tipoActivoId,
          propiedad,
          valorAdquisicion: valorAdquisicion || undefined,
          valorReposicion: valorReposicion || undefined,
        },
      });
      setCodigo('');
      setValorAdquisicion('');
      setValorReposicion('');
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el activo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal open={abierto} title="Registrar activo" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <ErrorAlert message={error} />
        <div className="space-y-4">
          <Field label="Identificador (opcional)">
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Se genera como PROPIA-XXXXXXXX o ERCOL-XXXXXXXX"
            />
          </Field>
          <Field label="Tipo de activo">
            <Select value={tipoActivoId} onChange={(e) => setTipoActivoId(e.target.value)} required>
              <option value="">Selecciona un tipo…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Propiedad">
            <Select value={propiedad} onChange={(e) => setPropiedad(e.target.value)}>
              <option value="PROPIA">Propia</option>
              <option value="ERCOL">ERCOL</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor adquisición (opcional)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorAdquisicion}
                onChange={(e) => setValorAdquisicion(e.target.value)}
              />
            </Field>
            <Field label="Valor reposición (opcional)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorReposicion}
                onChange={(e) => setValorReposicion(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
