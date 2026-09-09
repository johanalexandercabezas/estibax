import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, App as AntApp, Typography } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSedes } from '../context/SedeContext';
import { PageHeader, ErrorAlert } from '../components/ui';
import RolesTab from './configuracion/RolesTab';
import UsuariosTab from './configuracion/UsuariosTab';
import ClienteFacturablesTab from './configuracion/ClienteFacturablesTab';
import UbicacionesTab from './configuracion/UbicacionesTab';

const { Text } = Typography;

interface Sede { id: string; nombre: string }
interface TipoActivo { id: string; nombre: string; descripcion?: string | null }
interface ConfigData {
  empresa: { id: string; nombre: string; nit: string | null } | null;
  sedes: Sede[];
  tiposActivo: TipoActivo[];
  clientesFacturables?: { id: string; nombre: string; tarifaDiaria: number; activo: boolean }[];
}

/** CRUD genérico para catálogos simples (solo superusuario edita). */
function CatalogoCrud<T extends { id: string; nombre: string }>({
  titulo, filas, endpoint, campos, puedeEscribir, refrescar,
}: {
  titulo: string;
  filas: T[];
  endpoint: string;
  campos: { key: 'nombre' | 'descripcion'; label: string; textarea?: boolean }[];
  puedeEscribir: boolean;
  refrescar: () => void;
}) {
  const { message } = AntApp.useApp();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);

  const abrirNuevo = () => { setEditando(null); form.resetFields(); setAbierto(true); };
  const abrirEdicion = (fila: T) => { setEditando(fila); form.setFieldsValue(fila); setAbierto(true); };

  const guardar = async () => {
    const valores = await form.validateFields();
    setGuardando(true);
    try {
      if (editando) {
        await api(`${endpoint}/${editando.id}`, { method: 'PUT', body: valores });
        message.success('Registro actualizado');
      } else {
        await api(endpoint, { method: 'POST', body: valores });
        message.success('Registro creado');
      }
      setAbierto(false);
      refrescar();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {puedeEscribir && (
        <div className="mb-3 flex justify-end">
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>Nuevo</Button>
        </div>
      )}
      <Table
        rowKey="id"
        size="middle"
        dataSource={filas}
        pagination={false}
        columns={[
          { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
          campos.some((c) => c.key === 'descripcion') && {
            title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion',
            render: (v?: string | null) => v || <Text type="secondary">—</Text>,
          },
          puedeEscribir && {
            title: '', key: 'acciones', width: 60,
            render: (_: unknown, fila: T) => (
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrirEdicion(fila)} />
            ),
          },
        ].filter(Boolean) as object[]}
      />
      <Modal
        title={editando ? `Editar ${titulo.toLowerCase()}` : `Nuevo en ${titulo.toLowerCase()}`}
        open={abierto}
        onOk={guardar}
        onCancel={() => setAbierto(false)}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          {campos.map((c) => (
            <Form.Item
              key={c.key}
              name={c.key}
              label={c.label}
              rules={c.key === 'nombre' ? [{ required: true, message: 'Obligatorio' }] : []}
            >
              {c.textarea ? <Input.TextArea rows={2} /> : <Input />}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </>
  );
}


export default function Configuracion() {
  const { usuario } = useAuth();
  const { recargar: refrescarSedes } = useSedes();
  const [data, setData] = useState<ConfigData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const puedeEscribir = usuario?.permisos?.configuracion?.includes('write') ?? false;

  const cargar = async () => {
    try {
      setData(await api<ConfigData>('/configuracion/empresa'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar configuración');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  if (cargando) return <div className="py-20 text-center text-gray-400">Cargando configuración…</div>;

  const refrescarTodo = () => { void cargar(); void refrescarSedes(); };

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle={puedeEscribir
          ? 'Como superusuario puedes crear y editar catálogos, roles, permisos y usuarios'
          : 'Datos maestros de la empresa (solo lectura)'}
      />
      <ErrorAlert message={error} />

      <Tabs
        type="card"
        items={[
          {
            key: 'empresa',
            label: 'Empresa',
            children: (
              <div className="rounded-xl2 bg-white p-6 shadow-sm">
                <p><Text type="secondary">Nombre: </Text><Text strong>{data?.empresa?.nombre}</Text></p>
                <p><Text type="secondary">NIT: </Text><Text strong>{data?.empresa?.nit ?? '—'}</Text></p>
              </div>
            ),
          },
          {
            key: 'sedes',
            label: `Sedes / Plataformas (${data?.sedes.length ?? 0})`,
            children: (
              <div className="rounded-xl2 bg-white p-6 shadow-sm">
                <CatalogoCrud<Sede>
                  titulo="Sedes"
                  filas={data?.sedes ?? []}
                  endpoint="/configuracion/sedes"
                  campos={[{ key: 'nombre', label: 'Nombre de la sede / ciudad' }]}
                  puedeEscribir={puedeEscribir}
                  refrescar={refrescarTodo}
                />
              </div>
            ),
          },
          {
            key: 'tipos',
            label: `Materiales (${data?.tiposActivo.length ?? 0})`,
            children: (
              <div className="rounded-xl2 bg-white p-6 shadow-sm">
                <CatalogoCrud<TipoActivo>
                  titulo="Materiales"
                  filas={data?.tiposActivo ?? []}
                  endpoint="/configuracion/tipos-activo"
                  campos={[
                    { key: 'nombre', label: 'Nombre del material / tipo de estiba' },
                    { key: 'descripcion', label: 'Descripción', textarea: true },
                  ]}
                  puedeEscribir={puedeEscribir}
                  refrescar={cargar}
                />
              </div>
            ),
          },
          { key: 'roles', label: 'Roles y permisos', children: <RolesTab puedeEscribir={puedeEscribir} /> },
          { key: 'usuarios', label: 'Usuarios', children: <UsuariosTab puedeEscribir={puedeEscribir} /> },
          {
            key: 'clientes-facturables',
            label: `Clientes facturables (${data?.clientesFacturables?.length ?? 0})`,
            children: <ClienteFacturablesTab puedeEscribir={puedeEscribir} />,
          },
          { key: 'ubicaciones', label: 'Ubicaciones', children: <UbicacionesTab /> },
        ]}
      />
    </div>
  );
}
