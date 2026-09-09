import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Movimiento } from '../pages/Movimientos';

export interface NovedadReporte {
  id: string;
  fecha: string;
  estado: string;
  disposicion: string | null;
  descripcion: string;
  causa: string | null;
  responsable: string | null;
  reparacion: number | null;
  indemnizacion?: number | null;
  sede?: string | null;
  activo?: { codigo: string } | null;
}

export function useReportes() {
  const formatFecha = (f: string) => new Date(f).toLocaleString('es-CO');

  const exportarMovimientosPDF = (movimientos: Movimiento[], titulo = 'Reporte de Movimientos') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(22);
    doc.text('E', 22, 30);
    doc.setFontSize(18);
    doc.text(titulo, 28, 28);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString('es-CO')}`, 22, 36);

    const columns = [
      { header: 'Documento', dataKey: 'documento' },
      { header: 'Tipo', dataKey: 'tipo' },
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Cliente', dataKey: 'cliente' },
      { header: 'Despacho', dataKey: 'despacho' },
      { header: 'Activos', dataKey: 'activos' },
      { header: 'Firma', dataKey: 'firma' },
      { header: 'Estado', dataKey: 'estado' },
    ];

    const rows = movimientos.map((m) => ({
      documento: m.documento,
      tipo: m.tipo.replace('_', ' '),
      fecha: formatFecha(m.fechaEfectiva),
      cliente: m.cliente?.nombre ?? '—',
      despacho:
        ('vehiculo' in m && m.vehiculo?.placa) || ('transportista' in m && m.transportista?.nombre)
          ? [m.vehiculo?.placa, m.transportista?.nombre].filter(Boolean).join(' · ')
          : '—',
      activos: m.lineas.length,
      firma: m.firmaNombre ? `${m.firmaNombre} (${m.firmaCargo})` : '—',
      estado: m.estado.replace('_', ' '),
    }));

    autoTable(doc, {
      startY: 44,
      columns,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 227], fontSize: 9 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save('movimientos.pdf');
  };

  const exportarKardexPDF = (movimientos: Movimiento[], titulo = 'Reporte de Kardex') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(22);
    doc.text('E', 22, 30);
    doc.setFontSize(18);
    doc.text(titulo, 28, 28);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString('es-CO')}`, 22, 36);

    const columns = [
      { header: 'Documento', dataKey: 'documento' },
      { header: 'Tipo', dataKey: 'tipo' },
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Cliente', dataKey: 'cliente' },
      { header: 'Activo', dataKey: 'activo' },
      { header: 'Entra', dataKey: 'entra' },
      { header: 'Sale', dataKey: 'sale' },
      { header: 'Estado', dataKey: 'estado' },
    ];

    const rows: Record<string, unknown>[] = [];
    movimientos.forEach((m) => {
      m.lineas.forEach((l) => {
        const entra = m.tipo === 'ENTRADA' || m.tipo === 'DEVOLUCION' ? l.cantidad : 0;
        const sale = m.tipo === 'SALIDA' || m.tipo === 'PRESTAMO' ? l.cantidad : 0;
        rows.push({
          documento: m.documento,
          tipo: m.tipo.replace('_', ' '),
          fecha: formatFecha(m.fechaEfectiva),
          cliente: m.cliente?.nombre ?? '—',
          activo: l.activo?.codigo ?? l.activo?.id ?? '—',
          entra,
          sale,
          estado: m.estado.replace('_', ' '),
        });
      });
    });

    autoTable(doc, {
      startY: 44,
      columns,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [79, 70, 227], fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save('kardex.pdf');
  };

  /** Reporte de novedades (daños, pérdidas y su resolución) con encabezado ICOLTRANS. */
  const exportarNovedadesPDF = (
    novedades: NovedadReporte[],
    titulo = 'Reporte de Novedades',
    sede?: string | null,
  ) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    // Encabezado corporativo (verde ICOLTRANS)
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, 210, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ICOLTRANS - ESTIBAX', 14, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Industria Colombiana de Logística y Transporte', 14, 14);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(titulo, 14, 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Alcance: ${sede ?? 'Todas las sedes'} · Generado el: ${new Date().toLocaleString('es-CO')}`,
      14,
      31,
    );

    const columns = [
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Activo', dataKey: 'activo' },
      { header: 'Sede', dataKey: 'sede' },
      { header: 'Estado', dataKey: 'estado' },
      { header: 'Disposición', dataKey: 'disposicion' },
      { header: 'Causa', dataKey: 'causa' },
      { header: 'Responsable', dataKey: 'responsable' },
      { header: 'Valor', dataKey: 'valor' },
    ];

    const rows = novedades.map((n) => ({
      fecha: formatFecha(n.fecha),
      activo: n.activo?.codigo ?? '—',
      sede: n.sede ?? '—',
      estado: (n.estado ?? '').replace('_', ' '),
      disposicion: (n.disposicion ?? '—').replace('_', ' '),
      causa: n.causa ?? '—',
      responsable: n.responsable ?? '—',
      valor:
        n.indemnizacion != null
          ? `$${Number(n.indemnizacion).toLocaleString('es-CO')}`
          : n.reparacion != null
            ? `$${Number(n.reparacion).toLocaleString('es-CO')}`
            : '—',
    }));

    autoTable(doc, {
      startY: 38,
      columns,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [22, 163, 74], fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save('novedades-icoltrans.pdf');
  };

  interface LiquidacionCobroPDF {
    id: string;
    clienteFact?: { nombre: string };
    estibasDia: number;
    cobro: number;
    estado?: string;
    detalles?: Array<{
      id: string;
      plataformaNombre: string;
      fecha: string;
      entregadas: number;
      devueltas: number;
      saldoDiario: number;
      cobroDiario: number;
    }>;
  }

  /** Liquidación mensual de cobros (algoritmo Excel) con encabezado ICOLTRANS. */
  const exportarLiquidacionCobrosPDF = (
    liquidaciones: LiquidacionCobroPDF[],
    anio: number,
    mes: number,
    sede?: string | null,
  ) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, 210, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ICOLTRANS - ESTIBAX', 14, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Industria Colombiana de Logística y Transporte', 14, 14);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Liquidación Mensual de Cobros', 14, 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Periodo: ${mes.toString().padStart(2, '0')}/${anio} · Alcance: ${sede ?? 'Todas las sedes'} · Generado el: ${new Date().toLocaleString('es-CO')}`,
      14,
      31,
    );

    const totalEstibas = liquidaciones.reduce((a, l) => a + l.estibasDia, 0);
    const totalCobro = liquidaciones.reduce((a, l) => a + Number(l.cobro), 0);

    autoTable(doc, {
      startY: 38,
      columns: [
        { header: 'Cliente', dataKey: 'cliente' },
        { header: 'Estibas-día', dataKey: 'estibasDia' },
        { header: 'Cobro del mes (COP)', dataKey: 'cobro' },
        { header: 'Estado', dataKey: 'estado' },
      ],
      body: liquidaciones.map((l) => ({
        cliente: l.clienteFact?.nombre ?? '—',
        estibasDia: l.estibasDia.toLocaleString('es-CO'),
        cobro: `$${Number(l.cobro).toLocaleString('es-CO')}`,
        estado: l.estado,
      })),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74], fontSize: 9 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      foot: [
        [
          `TOTAL · ${totalEstibas.toLocaleString('es-CO')} estibas-día`,
          '',
          `$${totalCobro.toLocaleString('es-CO')}`,
          '',
        ],
      ],
      footStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Detalle diario por cliente en páginas adicionales
    liquidaciones.forEach((l, idx) => {
      if (!l.detalles || l.detalles.length === 0) return;
      doc.addPage();
      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, 210, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Detalle diario · ${l.clienteFact?.nombre ?? '—'} · ${mes.toString().padStart(2, '0')}/${anio}`, 14, 7);

      autoTable(doc, {
        startY: 16,
        columns: [
          { header: 'Fecha', dataKey: 'fecha' },
          { header: 'Plataforma', dataKey: 'plataforma' },
          { header: 'Entregadas', dataKey: 'entregadas' },
          { header: 'Devueltas', dataKey: 'devueltas' },
          { header: 'Saldo día', dataKey: 'saldo' },
          { header: 'Cobro día', dataKey: 'cobro' },
        ],
        body: l.detalles
          .slice()
          .sort((a, b) => (a.plataformaNombre + a.fecha).localeCompare(b.plataformaNombre + b.fecha))
          .map((d) => ({
            fecha: new Date(d.fecha).toLocaleDateString('es-CO'),
            plataforma: d.plataformaNombre,
            entregadas: d.entregadas || '',
            devueltas: d.devueltas || '',
            saldo: d.saldoDiario,
            cobro: `$${(d.saldoDiario * Number(d.cobroDiario)).toLocaleString('es-CO')}`,
          })),
        theme: 'grid',
        styles: { fontSize: 7 },
        headStyles: { fillColor: [22, 163, 74], fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { top: 16 },
      });

      if (idx < liquidaciones.length - 1) {
        // espacio entre clientes manejado por addPage del siguiente
      }
    });

    doc.save(`liquidacion-cobros-${anio}-${mes.toString().padStart(2, '0')}.pdf`);
  };

  return { exportarMovimientosPDF, exportarKardexPDF, exportarNovedadesPDF, exportarLiquidacionCobrosPDF };
}
