import { useEffect, useMemo, useState } from 'react';
import { Button, Space, Table, Typography, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { api } from '../lib/api';
import { useSedes } from '../context/SedeContext';
import { ErrorAlert, PageHeader } from '../components/ui';

const { Text } = Typography;

interface ActivoEtiqueta {
  id: string;
  codigo: string;
  propiedad: string;
  tipoActivo?: { nombre: string };
  ubicacion?: {
    nombre: string;
    bodega?: { nombre: string; planta?: { nombre: string; sede?: { nombre: string } } };
  };
}

interface EtiquetaRendered {
  id: string;
  codigo: string;
  propiedad: string;
  material: string;
  sede: string;
  qr: string;
  barra: string;
}

export default function Etiquetas() {
  const { sedeActiva } = useSedes();
  const [activos, setActivos] = useState<ActivoEtiqueta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [generando, setGenerando] = useState(false);

  const sedeDe = (a: ActivoEtiqueta) =>
    a.ubicacion?.bodega?.planta?.sede?.nombre ?? 'Sin sede';

  useEffect(() => {
    (async () => {
      try {
        const res = await api<ActivoEtiqueta[] | { data: ActivoEtiqueta[] }>('/activos', {
          params: { sedeId: sedeActiva?.id },
        });
        const lista = Array.isArray(res) ? res : res.data ?? [];
        setActivos(lista);
        setSeleccion([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar activos');
      } finally {
        setCargando(false);
      }
    })();
  }, [sedeActiva?.id]);

  const seleccionados = useMemo(
    () => activos.filter((a) => seleccion.includes(a.id)),
    [activos, seleccion],
  );

  const generarPDF = async () => {
    if (seleccionados.length === 0) {
      message.warning('Selecciona al menos una estiba');
      return;
    }
    setGenerando(true);
    try {
      const renderizadas: EtiquetaRendered[] = [];
      for (const a of seleccionados) {
        const canvasBarra = document.createElement('canvas');
        JsBarcode(canvasBarra, a.codigo, { format: 'CODE128', displayValue: false, width: 2, height: 60, margin: 0 });
        renderizadas.push({
          id: a.id,
          codigo: a.codigo,
          propiedad: a.propiedad === 'ERCOL' ? 'ERCOL' : 'PROPIA',
          material: a.tipoActivo?.nombre ?? '—',
          sede: sedeDe(a),
          qr: await QRCode.toDataURL(JSON.stringify({ id: a.id, propiedad: a.propiedad, codigo: a.codigo }), { width: 260, margin: 1 }),
          barra: canvasBarra.toDataURL('image/png'),
        });
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210, etW = 92, etH = 78, cols = 2, filasPorHoja = 3;
      const margenX = (pageW - cols * etW) / 2;
      const startY = 18, gapY = etH + 6;

      renderizadas.forEach((e, idx) => {
        if (idx > 0 && idx % (cols * filasPorHoja) === 0) doc.addPage();
        const col = idx % cols;
        const fila = Math.floor((idx % (cols * filasPorHoja)) / cols);
        const x = margenX + col * etW;
        const y = startY + fila * gapY;

        doc.setDrawColor(190, 211, 197);
        doc.setLineWidth(0.45);
        doc.roundedRect(x, y, etW, etH, 2, 2);
        doc.setFillColor(16, 61, 43);
        doc.roundedRect(x + 3, y + 3, etW - 6, 11, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('ESTIBAX  /  ICOLTRANS', x + 5, y + 10.3);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(13);
        doc.text(e.codigo || 'SIN IDENTIFICADOR', x + 5, y + 26);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Material: ' + e.material, x + 5, y + 33);
        doc.text('Propiedad: ' + e.propiedad, x + 5, y + 39);
        doc.text('Plataforma: ' + e.sede, x + 5, y + 45);
        doc.setDrawColor(220, 231, 223);
        doc.line(x + 5, y + 48, x + etW - 5, y + 48);

        try {
          doc.addImage(e.barra, 'PNG', x + 7, y + 54, etW - 14, 13);
        } catch {
          // opcional
        }
        try {
          doc.addImage(e.qr, 'PNG', x + etW - 31, y + 17, 24, 24);
        } catch {
          // opcional
        }
      });

      doc.save('etiquetas-estibas-icoltrans.pdf');
      message.success(renderizadas.length + ' etiquetas generadas');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al generar el PDF');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Etiquetas QR y Código de Barras"
        subtitle="Genera etiquetas profesionales de las estibas propias para imprimir en cualquier sede del país"
      />
      <ErrorAlert message={error} />
      <Space className="mb-4 flex w-full flex-wrap justify-between">
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          loading={generando}
          onClick={generarPDF}
          disabled={seleccionados.length === 0}
        >
          Imprimir etiquetas ({seleccionados.length}) - PDF
        </Button>
        <Text type="secondary">
          {sedeActiva ? 'Etiquetas de la sede: ' + sedeActiva.nombre : 'Todas las sedes'}
        </Text>
      </Space>
      <Table
        rowKey="id"
        size="middle"
        loading={cargando}
        dataSource={activos}
        pagination={{ pageSize: 12 }}
        rowSelection={{
          selectedRowKeys: seleccion,
          onChange: (keys) => setSeleccion(keys as string[]),
        }}
        columns={[
          { title: 'Código', dataIndex: 'codigo', key: 'codigo', render: (v: string) => <Text strong>{v}</Text> },
          { title: 'Material', dataIndex: 'tipoActivo', key: 'tipoActivo', render: (t: ActivoEtiqueta['tipoActivo']) => t?.nombre ?? '—' },
          { title: 'Propiedad', dataIndex: 'propiedad', key: 'propiedad' },
          { title: 'Sede / Ciudad', key: 'sede', render: (_: unknown, a: ActivoEtiqueta) => <Text>{sedeDe(a)}</Text> },
        ]}
      />
    </div>
  );
}