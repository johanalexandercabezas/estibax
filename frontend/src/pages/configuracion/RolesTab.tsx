import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Checkbox, App as AntApp, Typography } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';

const { Text } = Typography;

const MODULOS = [
  'activos', 'clientes', 'movimientos', 'novedades', 'kardex',
  'economico', 'transportes', 'configuracion', 'auditoria', 'portal',
] as const;

interface Rol {
  id: string;
  nombre: string;
  permisos: string;
  _count?: { usuarios: number };
}

/** Pestaña de roles y permisos: matriz editable solo para superusuario. */
export default function RolesTab({ puedeEscribir }: { puedeEscribir: boolean }) {
  const { message } = AntApp.useApp();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Rol | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [permisos, setPermisos] = useState<Record<string, string[]>>({});
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      const data = await api<{ roles: Rol[] }>('/configuracion/empresa');
      setRoles(data.roles ?? []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al cargar roles');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const abrirNuevo = () => { setEditando(null); setNombre(''); setPermisos({}); setAbierto(true); };

  const abrirEdicion = (rol: Rol) => {
    let parsed: Record<string, string[]> = {};
    try { parsed = JSON.parse(rol.permisos); } catch { parsed = {}; }
    setEditando(rol); setNombre(rol.nombre); setPermisos(parsed); setAbierto(true);
  };

  const toggle = (modulo: string, accion: string) => {
    setPermisos((prev) => {
      const actuales = prev[modulo] ?? [];
      const nuevos = actuales.includes(accion) ? actuales.filter((a) => a !== accion) : [...actuales, accion];
      const copia = { ...prev };
      if (nuevos.length === 0) delete copia[modulo];
      else copia[modulo] = nuevos;
      return copia;
    });
  };

  const guardar = async () => {
    if (!nombre.trim()) { message.warning('El nombre del rol es obligatorio'); return; }
    setGuardando(true);
    try {
      if (editando) {
        await api(`/configuracion/roles/${editando.id}`, { method: 'PUT', body: { nombre, permisos } });
        message.success('Rol actualizado');
      } else {
        await api('/configuracion/roles', { method: 'POST', body: { nombre, permisos } });
        message.success('Rol creado');
      }
      setAbierto(false);
      await cargar();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar el rol');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl2 bg-white p-6 shadow-sm">
      <div className="mb-3 flex justify-end">
        {puedeEscribir && (
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>Nuevo rol</Button>
        )}
      </div>
      <Table
        rowKey="id"
        size="middle"
        loading={cargando}
        dataSource={roles}
        pagination={false}
        columns={[
          { title: 'Rol', dataIndex: 'nombre', key: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
          {
            title: 'Permisos',
            key: 'permisos',
            render: (_: unknown, rol: Rol) => {
              let parsed: Record<string, string[]> = {};
              try { parsed = JSON.parse(rol.permisos); } catch { parsed = {}; }
              const claves = Object.keys(parsed);
              return claves.length === 0
                ? <Text type="secondary">Sin permisos</Text>
                : <span>{claves.map((m) => `${m}: ${parsed[m].join('/')}`).join(' · ')}</span>;
            },
          },
          { title: 'Usuarios', key: 'usuarios', width: 100, render: (_: unknown, rol: Rol) => rol._count?.usuarios ?? 0 },
          puedeEscribir && {
            title: '', key: 'acciones', width: 60,
            render: (_: unknown, rol: Rol) => (
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrirEdicion(rol)} />
            ),
          },
        ].filter(Boolean) as object[]}
      />
      <Modal
        title={editando ? `Editar rol: ${editando.nombre}` : 'Nuevo rol'}
        open={abierto}
        onOk={guardar}
        onCancel={() => setAbierto(false)}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
        width={560}
      >
        <Form layout="vertical">
          <Form.Item label="Nombre del rol" required>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. SUPERVISOR" />
          </Form.Item>
          <p className="mb-2 text-sm font-medium">Permisos por módulo</p>
          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
              <span>Módulo</span>
              <span className="flex gap-6"><span>Ver</span><span>Editar</span></span>
            </div>
            {MODULOS.map((m) => (
              <div key={m} className="flex items-center justify-between">
                <Text>{m}</Text>
                <span className="flex gap-6">
                  <Checkbox checked={(permisos[m] ?? []).includes('read')} onChange={() => toggle(m, 'read')} />
                  <Checkbox checked={(permisos[m] ?? []).includes('write')} onChange={() => toggle(m, 'write')} />
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
              <Text>liberaciones (especial)</Text>
              <Checkbox
                checked={(permisos['liberaciones'] ?? []).includes('LIBERAR_ACTIVO')}
                onChange={() => toggle('liberaciones', 'LIBERAR_ACTIVO')}
              >
                LIBERAR_ACTIVO
              </Checkbox>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
