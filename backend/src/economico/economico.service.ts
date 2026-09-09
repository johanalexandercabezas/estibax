import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { fechaNoFutura } from '../common/validation/dates';

interface ResumenCobro {
  cantidadActivos: number;
  valorTotal: number;
  tarifaUnitario: number;
  desglose: { tipoActivoId: string; cantidad: number; tarifa: number; subtotal: number }[];
}

@Injectable()
export class EconomicoService {
  constructor(private readonly prisma: PrismaService) {}

  async listarContratos(empresaId: string) {
    const clientes = await this.prisma.cliente.findMany({
      where: { empresaId },
      select: { id: true },
    });
    const clienteIds = clientes.map((c) => c.id);
    return this.prisma.contrato.findMany({
      where: { clienteId: { in: clienteIds } },
      include: { tarifas: { include: { tipoActivo: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listarTarifas(empresaId: string, contratoId: string) {
    await this.verificarContratoEmpresa(empresaId, contratoId);
    return this.prisma.tarifa.findMany({
      where: { contratoId },
      include: { tipoActivo: true },
      orderBy: { fechaVigencia: 'desc' },
    });
  }

  /**
   * Tarifa vigente para un tipo de activo en una fecha determinada:
   * la más reciente con fechaVigencia <= fecha.
   */
  async tarifaVigente(
    empresaId: string,
    contratoId: string,
    tipoActivoId: string,
    fecha: Date,
  ) {
    fechaNoFutura(fecha, 'Fecha de vigencia');
    await this.verificarContratoEmpresa(empresaId, contratoId);
    const tarifas = await this.prisma.tarifa.findMany({
      where: { contratoId, tipoActivoId, fechaVigencia: { lte: fecha } },
      orderBy: { fechaVigencia: 'desc' },
      take: 1,
    });
    return tarifas[0] ?? null;
  }

  /**
   * Calcula el cobro del día para un contrato: activos en custodia del cliente
   * multiplicados por la tarifa vigente de cada tipo de activo.
   */
  async calcularCobroDiario(empresaId: string, contratoId: string, fecha: Date): Promise<ResumenCobro> {
    fechaNoFutura(fecha, 'Fecha de cobro');
    const contrato = await this.verificarContratoEmpresa(empresaId, contratoId);
    const clienteId = contrato.clienteId;

    const enCustodia = await this.prisma.activo.groupBy({
      by: ['tipoActivoId'],
      where: { clienteId, estadoLogistico: 'EN_CLIENTE' },
      _count: { _all: true },
    });

    if (!enCustodia.length) {
      return { cantidadActivos: 0, valorTotal: 0, tarifaUnitario: 0, desglose: [] };
    }

    const desglose: ResumenCobro['desglose'] = [];
    let cantidadActivos = 0;
    let valorTotal = 0;

    for (const grupo of enCustodia) {
      const cantidad = grupo._count._all;
      const tarifa = await this.tarifaVigente(empresaId, contratoId, grupo.tipoActivoId, fecha);
      const valorUnitario = tarifa ? Number(tarifa.valor) : 0;
      const subtotal = cantidad * valorUnitario;
      desglose.push({ tipoActivoId: grupo.tipoActivoId, cantidad, tarifa: valorUnitario, subtotal });
      cantidadActivos += cantidad;
      valorTotal += subtotal;
    }

    return {
      cantidadActivos,
      valorTotal,
      tarifaUnitario: cantidadActivos > 0 ? valorTotal / cantidadActivos : 0,
      desglose,
    };
  }

  async generarCobroDiario(empresaId: string, contratoId: string, fecha: Date) {
    fechaNoFutura(fecha, 'Fecha de cobro');
    const contrato = await this.verificarContratoEmpresa(empresaId, contratoId);
    const resumen = await this.calcularCobroDiario(empresaId, contratoId, fecha);

    const cobro = await this.prisma.cobroDiario.create({
      data: {
        empresaId,
        clienteId: contrato.clienteId,
        contratoId,
        fecha,
        cantidadActivos: resumen.cantidadActivos,
        tarifaUnitario: resumen.tarifaUnitario,
        valorTotal: resumen.valorTotal,
      },
    });

    return { cobro, desglose: resumen.desglose };
  }

  async liquidarMensual(empresaId: string, clienteId: string, anio: number, mes: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const inicio = new Date(Date.UTC(anio, mes - 1, 1));
    const fin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));

    const cobros = await this.prisma.cobroDiario.findMany({
      where: {
        empresaId,
        clienteId,
        fecha: { gte: inicio, lte: fin },
        liquidacionId: null,
      },
    });

    const total = cobros.reduce((acc, c) => acc + Number(c.valorTotal), 0);

    const liquidacion = await this.prisma.$transaction(async (tx) => {
      const liq = await tx.liquidacion.create({
        data: {
          empresaId,
          clienteId,
          periodoInicio: inicio,
          periodoFin: fin,
          total,
          estado: 'ABIERTA',
        },
      });

      if (cobros.length) {
        await tx.cobroDiario.updateMany({
          where: { id: { in: cobros.map((c) => c.id) } },
          data: { liquidacionId: liq.id },
        });
      }

      return liq;
    });

    return {
      liquidacion,
      cobrosIncluidos: cobros.length,
      cantidadActivos: cobros.reduce((acc, c) => acc + c.cantidadActivos, 0),
      total,
    };
  }

  async listarLiquidaciones(empresaId: string, filters?: any) {
    return this.prisma.liquidacion.findMany({
      where: {
        empresaId,
        ...(filters?.clienteId && { clienteId: filters.clienteId }),
        ...(filters?.estado && { estado: filters.estado }),
      },
      include: { cobros: true },
      orderBy: { createdAt: 'desc' },
    });
  }

      // === COBROS CON ALGORITMO EXCEL (saldo diario × tarifa) ===
  async listarClientesFacturables(empresaId: string) {
    return this.prisma.clienteFacturable.findMany({
      where: { empresaId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async getLiquidacionesMes(empresaId: string, anio: number, mes: number) {
    return this.prisma.liquidacionCF.findMany({
      where: { empresaId, anio, mes },
      include: { clienteFact: true, detalles: { orderBy: { fecha: 'asc' } } },
      orderBy: { clienteFact: { nombre: 'asc' } },
    });
  }

  async obtenerCierreIngreso(empresaId: string, anio: number, mes: number) {
    this.validarPeriodo(anio, mes);
    return this.prisma.cierreIngreso.upsert({
      where: { empresaId_anio_mes: { empresaId, anio, mes } },
      update: {},
      create: { empresaId, anio, mes, diaLimite: 2 },
    });
  }

  async configurarCierreIngreso(empresaId: string, anio: number, mes: number, diaLimite: number) {
    this.validarPeriodo(anio, mes);
    if (!Number.isInteger(diaLimite) || diaLimite < 1 || diaLimite > 10) {
      throw new BadRequestException('El día límite debe estar entre 1 y 10');
    }
    const actual = await this.obtenerCierreIngreso(empresaId, anio, mes);
    if (actual.estado === 'CERRADO') throw new BadRequestException('El cierre de ingreso ya está cerrado');
    return this.prisma.cierreIngreso.update({
      where: { id: actual.id },
      data: { diaLimite },
    });
  }

  async cerrarIngreso(empresaId: string, anio: number, mes: number, usuarioId: string) {
    const actual = await this.obtenerCierreIngreso(empresaId, anio, mes);
    return this.prisma.cierreIngreso.update({
      where: { id: actual.id },
      data: { estado: 'CERRADO', cerradoAt: new Date(), cerradoPor: usuarioId },
    });
  }

  /** Historial de periodos liquidados: resumen por (año, mes) con estado y totales. */
  async historial(empresaId: string) {
    const rows = await this.prisma.liquidacionCF.findMany({
      where: { empresaId },
      select: { anio: true, mes: true, estado: true, cobro: true, estibasDia: true },
    });
    const mapa = new Map<
      string,
      { anio: number; mes: number; clientes: number; totalCobro: number; totalEstibasDia: number; cerradas: number; abiertas: number }
    >();
    for (const r of rows) {
      const clave = `${r.anio}-${r.mes}`;
      const e = mapa.get(clave) ?? {
        anio: r.anio, mes: r.mes, clientes: 0, totalCobro: 0, totalEstibasDia: 0, cerradas: 0, abiertas: 0,
      };
      e.clientes += 1;
      e.totalCobro += Number(r.cobro);
      e.totalEstibasDia += r.estibasDia;
      if (r.estado === 'CERRADA') e.cerradas += 1;
      else e.abiertas += 1;
      mapa.set(clave, e);
    }
    return [...mapa.values()].sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  }

  // Algoritmo Excel: saldo[d] = saldo[d-1] + entregadas[d] - devueltas[d]
  async generarCobroExcel(empresaId: string, anio: number, mes: number, plataformas?: string[]) {
    const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
    const finMes = new Date(Date.UTC(anio, mes, 0));
    const cierre = await this.obtenerCierreIngreso(empresaId, anio, mes);
    const fechaLimite = new Date(Date.UTC(anio, mes, cierre.diaLimite, 23, 59, 59, 999));
    const dias: Date[] = [];
    for (let d = new Date(inicioMes); d <= finMes; d = new Date(d.getTime() + 86400000)) dias.push(new Date(d));

    const clientes = await this.prisma.clienteFacturable.findMany({
      where: { empresaId, activo: true },
    });
    if (!clientes.length) {
      throw new BadRequestException('No hay clientes facturables configurados. Ejecuta el seed primero.');
    }

    // Liquidaciones existentes del periodo: las CERRADAS no se regeneran (cierre de mes)
    const existentes = await this.prisma.liquidacionCF.findMany({
      where: { empresaId, anio, mes },
    });
    const cerradas = new Map(
      existentes.filter((e) => e.estado === 'CERRADA').map((e) => [e.clienteFactId, e]),
    );

    // Plataformas = sedes de la empresa (Barranquilla, Cota, ...)
    const sedes = await this.prisma.sede.findMany({ where: { empresaId } });
    const plataformasList = plataformas?.length
      ? plataformas
      : (sedes.length ? sedes.map((s) => s.nombre) : ['General']);

    // Operaciones digitadas hasta el cierre. Se incluyen meses anteriores para
    // arrastrar el saldo pendiente que genera cobro diario.
    const operaciones = await this.prisma.operacion.findMany({
      where: {
        empresaId,
        fecha: { lte: finMes },
        clienteId: { not: null },
      },
      select: {
        fecha: true,
        createdAt: true,
        clienteId: true,
        plataforma: { select: { nombre: true } },
        tipoDocumento: true,
        entregadas: true,
        devueltas: true,
      },
    });

    // Mapa clienteId -> nombre (para casar con ClienteFacturable por nombre)
    const clientesReg = await this.prisma.cliente.findMany({ where: { empresaId }, select: { id: true, nombre: true } });
    const nombreDe = new Map(clientesReg.map((c) => [c.id, c.nombre]));

    // Agrupar por fecha | nombreCliente | plataforma
    const datosPorDia = new Map<string, { entregadas: number; devueltas: number }>();
    const saldosIniciales = new Map<string, number>();
    for (const m of operaciones) {
      if (m.createdAt > fechaLimite) continue;
      const fechaStr = m.fecha.toISOString().split('T')[0];
      const nombre = nombreDe.get(m.clienteId!);
      if (!nombre) continue;
      const plataforma = m.plataforma?.nombre || 'General';
      const cantidad = m.tipoDocumento === 'CARTA_DEVOLUCION' ? m.devueltas : m.entregadas;
      const claveBase = `${nombre}|${plataforma}`;
      if (m.fecha < inicioMes) {
        saldosIniciales.set(claveBase, (saldosIniciales.get(claveBase) ?? 0) + (m.tipoDocumento === 'CARTA_DEVOLUCION' ? -cantidad : cantidad));
        continue;
      }
      const clave = `${fechaStr}|${claveBase}`;
      if (!datosPorDia.has(clave)) datosPorDia.set(clave, { entregadas: 0, devueltas: 0 });
      const d = datosPorDia.get(clave)!;
      if (m.tipoDocumento === 'CARTA_DEVOLUCION') d.devueltas += cantidad; else d.entregadas += cantidad;
    }

    const resultados: any[] = [];

    for (const cliente of clientes) {
      // Protección de cierre: las liquidaciones CERRADAS conservan sus valores
      const cerrada = cerradas.get(cliente.id);
      if (cerrada) {
        resultados.push({
          cliente: cliente.nombre,
          estibasDia: cerrada.estibasDia,
          tarifaDiaria: Number(cliente.tarifaDiaria),
          cobro: Number(cerrada.cobro),
          cerrada: true,
          plataformasConMovimiento: [],
          liquidacionId: cerrada.id,
        });
        continue;
      }

      const detalles: any[] = [];
      let estibasDiaMes = 0;
      let cobroTotal = 0;

      for (const plataforma of plataformasList) {
        let saldo = saldosIniciales.get(`${cliente.nombre}|${plataforma}`) ?? 0;
        for (const fecha of dias) {
          const fechaStr = fecha.toISOString().split('T')[0];
          const d = datosPorDia.get(`${fechaStr}|${cliente.nombre}|${plataforma}`) ?? { entregadas: 0, devueltas: 0 };
          saldo = saldo + d.entregadas - d.devueltas;
          estibasDiaMes += saldo;
          cobroTotal += saldo * Number(cliente.tarifaDiaria);
          detalles.push({
            plataformaNombre: plataforma,
            fecha: fecha,
            entregadas: d.entregadas,
            devueltas: d.devueltas,
            saldoDiario: saldo,
            cobroDiario: Number(cliente.tarifaDiaria),
          });
        }
      }

      const cobro = Math.round(cobroTotal);
      const liquidacion = await this.prisma.liquidacionCF.upsert({
        where: { empresaId_clienteFactId_anio_mes: { empresaId, clienteFactId: cliente.id, anio, mes } },
        update: { estibasDia: estibasDiaMes, cobro, estado: 'GENERADA', detalles: { deleteMany: {}, create: detalles } },
        create: { empresaId, clienteFactId: cliente.id, anio, mes, estibasDia: estibasDiaMes, cobro, detalles: { create: detalles } },
      });

      resultados.push({
        cliente: cliente.nombre,
        estibasDia: estibasDiaMes,
        tarifaDiaria: Number(cliente.tarifaDiaria),
        cobro,
        plataformasConMovimiento: [...new Set(detalles.filter((x) => x.entregadas > 0 || x.devueltas > 0).map((x) => x.plataformaNombre))],
        liquidacionId: liquidacion.id,
      });
    }

    const totalEstibasDia = resultados.reduce((a, r) => a + r.estibasDia, 0);
    const totalCobro = resultados.reduce((a, r) => a + r.cobro, 0);

    return {
      anio,
      mes: mes.toString().padStart(2, '0'),
      generadoEn: new Date().toISOString(),
      plataformas: plataformasList,
      cerradas: cerradas.size,
      totales: { estibasDia: totalEstibasDia, cobro: totalCobro },
      detalle: resultados,
    };
  }

  /** Cierra el mes: marca todas las liquidaciones del periodo como CERRADA. */
  async cerrarMes(empresaId: string, anio: number, mes: number) {
    const result = await this.prisma.liquidacionCF.updateMany({
      where: { empresaId, anio, mes, estado: { not: 'CERRADA' } },
      data: { estado: 'CERRADA' },
    });
    return { anio, mes, cerradas: result.count };
  }

  private async verificarContratoEmpresa(empresaId: string, contratoId: string) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id: contratoId },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado');

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: contrato.clienteId, empresaId },
    });
    if (!cliente) {
      throw new BadRequestException('El contrato no pertenece a la empresa');
    }
    return contrato;
  }

  private validarPeriodo(anio: number, mes: number) {
    if (!Number.isInteger(anio) || anio < 2020 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new BadRequestException('Periodo inválido');
    }
  }
}
