import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Switch, App as AntApp, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';

const { Text } = Typography;

interface ClienteFacturable {
  id: string;
  nombre: string;
  tarifaDiaria: number;
  activo: boolean;
}

/** Pestaña de clientes facturables: tarifas diarias del algoritmo de cobros Excel. */
export default function ClienteFacturablesTab({ puedeEscribir }: { puedeEscribir: boolean }) {
  const { message } = AntApp.useApp();
  const [clientes, setClientes] = useState<ClienteFacturable[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<ClienteFacturable | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [form] = Form.useForm();

  const cargar = async () => {
    try {
      const cfg = await api<{ clientesFacturables?: ClienteFacturable[] }>('/configuracion/empresa');
      setClientes(cfg.clientesFacturables ?? []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al cargar clientes facturables');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const abrirNuevo = () => {
    form.resetFields();
    form.setFieldsValue({ activo: true, tarifaDiaria: 200 });
    setEditando(null);
    setAbierto(true);
  };

  const abrirEdicion = (c: ClienteFacturable) => {
    form.setFieldsValue({ nombre: c.nombre, tarifaDiaria: Number(c.tarifaDiaria), activo: c.activo });
    setEditando(c);
    setAbierto(true);
  };

  const guardar = async () => {
    const v = await form.validateFields();
    setGuardando(true);
    try {
      const body = { nombre: v.nombre, tarifaDiaria: Number(v.tarifaDiaria), activo: v.activo ?? true };
      if (editando) {
        await api(`/configuracion/clientes-facturables/${editando.id}`, { method: 'PUT', body });
        message.success('Cliente facturable actualizado');
      } else {
        await api('/configuracion/clientes-facturables', { method: 'POST', body });
        message.success('Cliente facturable creado');
      }
      setAbierto(false);
      await cargar();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const totalTarifas = clientes.filter((c) => c.activo).reduce((a, c) => a + Number(c.tarifaDiaria), 0);

  return (
    <div className="rounded-xl2 bg-white p-6 shadow-sm">
      <p className="mb-3 text-sm text-gray-500">
        Los cobros mensuales se calculan como Σ(saldo diario × tarifa diaria). Total de tarifas activas:{' '}
        <Text strong>${totalTarifas.toLocaleString('es-CO')}</Text>
      </p>
      <div className="mb-3 flex justify-end">
        {puedeEscribir && (
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>Nuevo cliente facturable</Button>
        )}
      </div>
      <Table
        rowKey="id"
        size="middle"
        loading={cargando}
        dataSource={clientes}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', render: (v: string) => <Text strong>{v}</Text> },
          {
            title: 'Tarifa diaria', dataIndex: 'tarifaDiaria', key: 'tarifaDiaria',
            render: (v: number) => <Text strong>${Number(v).toLocaleString('es-CO')}</Text>,
          },
          {
            title: 'Estado', key: 'activo', width: 100,
            render: (_: unknown, c: ClienteFacturable) =>
              c.activo ? <Tag color="success">Activo</Tag> : <Tag color="default">Inactivo</Tag>,
          },
          puedeEscribir && {
            title: '', key: 'acciones', width: 60,
            render: (_: unknown, c: ClienteFacturable) => (
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrirEdicion(c)} />
            ),
          },
        ].filter(Boolean) as object[]}
      />
      <Modal
        title={editando ? 'Editar cliente facturable' : 'Nuevo cliente facturable'}
        open={abierto}
        onOk={guardar}
        onCancel={() => setAbierto(false)}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Ej. Cliente ABC" />
          </Form.Item>
          <Form.Item
            name="tarifaDiaria"
            label="Tarifa diaria (COP)"
            rules={[{ required: true, message: 'Obligatoria' }]}
          >
            <InputNumber min={0} step={50} className="w-full" prefix="$" />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}