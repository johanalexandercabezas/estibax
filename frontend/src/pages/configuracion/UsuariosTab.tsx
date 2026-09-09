import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, App as AntApp, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';

const { Text } = Typography;

interface Rol { id: string; nombre: string }

interface Usuario {
  id: string; nombre: string; email: string; activo: boolean;
  rol?: { id: string; nombre: string } | null;
  cliente?: { id: string; nombre: string } | null;
}

/** Pestaña de usuarios: crear y editar (rol, estado, contraseña) solo superusuario. */
export default function UsuariosTab({ puedeEscribir }: { puedeEscribir: boolean }) {
  const { message } = AntApp.useApp();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [form] = Form.useForm();

  const cargar = async () => {
    try {
      const [usrs, cfg, clis] = await Promise.all([
        api<Usuario[]>('/configuracion/usuarios'),
        api<{ roles: Rol[] }>('/configuracion/empresa'),
        api<{ id: string; nombre: string }[]>('/clientes'),
      ]);
      setUsuarios(Array.isArray(usrs) ? usrs : []);
      setRoles(cfg.roles ?? []);
      setClientes(Array.isArray(clis) ? clis : []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const abrirNuevo = () => {
    form.resetFields();
    form.setFieldsValue({ activo: true });
    setEditando(null);
    setAbierto(true);
  };

  const abrirEdicion = (u: Usuario) => {
    form.setFieldsValue({
      nombre: u.nombre, email: u.email, rolId: u.rol?.id,
      clienteId: u.cliente?.id ?? null, activo: u.activo, password: '',
    });
    setEditando(u);
    setAbierto(true);
  };

  const guardar = async () => {
    const v = await form.validateFields();
    setGuardando(true);
    try {
      if (editando) {
        const body: Record<string, unknown> = {
          nombre: v.nombre, rolId: v.rolId, activo: v.activo, clienteId: v.clienteId || null,
        };
        if (v.password) body.password = v.password;
        await api(`/configuracion/usuarios/${editando.id}`, { method: 'PUT', body });
        message.success('Usuario actualizado');
      } else {
        await api('/configuracion/usuarios', { method: 'POST', body: v });
        message.success('Usuario creado');
      }
      setAbierto(false);
      await cargar();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl2 bg-white p-6 shadow-sm">
      <div className="mb-3 flex justify-end">
        {puedeEscribir && (
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>Nuevo usuario</Button>
        )}
      </div>
      <Table
        rowKey="id"
        size="middle"
        loading={cargando}
        dataSource={usuarios}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
          { title: 'Email', dataIndex: 'email', key: 'email' },
          { title: 'Rol', key: 'rol', render: (_: unknown, u: Usuario) => <Tag color="green">{u.rol?.nombre ?? '—'}</Tag> },
          {
            title: 'Cliente vinculado', key: 'cliente',
            render: (_: unknown, u: Usuario) => u.cliente?.nombre ?? <Text type="secondary">—</Text>,
          },
          {
            title: 'Estado', key: 'activo', width: 100,
            render: (_: unknown, u: Usuario) =>
              u.activo ? <Tag color="success">Activo</Tag> : <Tag color="default">Inactivo</Tag>,
          },
          puedeEscribir && {
            title: '', key: 'acciones', width: 60,
            render: (_: unknown, u: Usuario) => (
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrirEdicion(u)} />
            ),
          },
        ].filter(Boolean) as object[]}
      />
      <Modal
        title={editando ? 'Editar usuario' : 'Nuevo usuario'}
        open={abierto}
        onOk={guardar}
        onCancel={() => setAbierto(false)}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: !editando, type: 'email', message: 'Email inválido' }]}
          >
            <Input disabled={Boolean(editando)} placeholder="usuario@icoltrans.local" />
          </Form.Item>
          <Form.Item name="rolId" label="Rol" rules={[{ required: true, message: 'Selecciona un rol' }]}>
            <Select options={roles.map((r) => ({ value: r.id, label: r.nombre }))} placeholder="Rol del usuario" />
          </Form.Item>
          <Form.Item name="clienteId" label="Cliente vinculado (solo para rol CLIENTE)">
            <Select allowClear options={clientes.map((c) => ({ value: c.id, label: c.nombre }))} placeholder="Ninguno" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editando ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}
            rules={editando ? [] : [{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
