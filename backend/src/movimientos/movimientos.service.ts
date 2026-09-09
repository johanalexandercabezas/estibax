import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import { ActivosService } from '../activos/activos.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { fechaNoFutura } from '../common/validation/dates';
import { TipoMovimiento, EstadoLogistico, EstadoOperativo } from '@prisma/client';

@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientesService: ClientesService,
    private readonly activosService: ActivosService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(empresaId: string, filters?: any) {
    return this.prisma.movimiento.findMany({
      where: { empresaId, ...(filters?.tipo && { tipo: filters.tipo }), ...(filters?.estado && { estado: filters.estado }) },
      include: {
        lineas: { include: { activo: true } },
        cliente: true,
        vehiculo: { select: { placa: true } },
        transportista: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(empresaId: string, movimientoId: string) {
    const mov = await this.prisma.movimiento.findFirst({
      where: { id: movimientoId, empresaId },
      include: {
        lineas: { include: { activo: true } },
        cliente: true,
        kardexEntries: true,
        vehiculo: { select: { placa: true } },
        transportista: { select: { nombre: true } },
      },
    });
    if (!mov) throw new NotFoundException('Movimiento no encontrado');
    return mov;
  }

  async crearBorrador(empresaId: string, data: any, usuarioId: string) {
    const lineas = data.lineas || [];
    if (!lineas.length) throw new BadRequestException('Debe incluir al menos una linea');
    // El documento definitivo (numeracion consecutiva) se asigna al confirmar.
    // En borrador se usa un documento provisional unico.
    const documentoProvisional = 'BORRADOR-' + crypto.randomUUID();
    return this.prisma.$transaction(async (tx) => {
      if (data.clienteId) {
        const cliente = await tx.cliente.findFirst({ where: { id: data.clienteId, empresaId } });
        if (!cliente) throw new BadRequestException('El cliente no pertenece a la empresa');
      }
      for (const linea of lineas) {
        if (linea.activoId) {
          const activo = await tx.activo.findFirst({ where: { id: linea.activoId, empresaId } });
          if (!activo) throw new BadRequestException('Una línea contiene un activo que no pertenece a la empresa');
        } else if (!linea.poolErcolId) {
          throw new BadRequestException('Cada línea debe incluir activoId o poolErcolId');
        }
        if (!Number.isInteger(Number(linea.cantidad)) || Number(linea.cantidad) <= 0) {
          throw new BadRequestException('La cantidad de cada línea debe ser un entero positivo');
        }
      }
      const mov = await tx.movimiento.create({
        data: {
          empresaId,
          tipo: data.tipo,
          documento: documentoProvisional,
          fechaEfectiva: fechaNoFutura(data.fechaEfectiva, 'Fecha efectiva'),
          estado: 'BORRADOR',
          origenId: data.origenId ?? null,
          destinoId: data.destinoId ?? null,
          clienteId: data.clienteId ?? null,
          proveedorId: data.proveedorId ?? null,
          vehiculoId: data.vehiculoId ?? null,
          transportistaId: data.transportistaId ?? null,
          responsableId: usuarioId,
        },
      });
      await tx.movimientoLinea.createMany({
        data: lineas.map((l: any) => ({
          movimientoId: mov.id,
          activoId: l.activoId,
          cantidad: l.cantidad || 1,
          estadoFisico: l.estadoFisico ?? null,
          notas: l.notas ?? null,
        })),
      });
      return tx.movimiento.findUniqueOrThrow({
        where: { id: mov.id },
        include: {
          lineas: { include: { activo: true } },
          vehiculo: { select: { placa: true } },
          transportista: { select: { nombre: true } },
        },
      });
    });
  }

  async confirmar(empresaId: string, movimientoId: string, usuarioId: string, firma?: { nombre?: string; documento?: string; cargo?: string }) {
    const mov = await this.findById(empresaId, movimientoId);
    if (mov.estado !== 'BORRADOR')
      throw new BadRequestException('Solo confirmar borradores');
    const lineas = await this.prisma.movimientoLinea.findMany({
      where: { movimientoId: mov.id }, include: { activo: true },
    });
    if (!lineas.length) throw new BadRequestException('Sin lineas');
    await this.validarLineas(empresaId, mov.tipo, lineas, mov);

    // Firma electrónica obligatoria en entregas (SALIDA/PRESTAMO) y devoluciones.
    const requiereFirma = mov.tipo === 'SALIDA' || mov.tipo === 'PRESTAMO' || mov.tipo === 'DEVOLUCION';
    if (requiereFirma) {
      if (!firma?.nombre || !firma?.documento || !firma?.cargo) {
        throw new BadRequestException(
          'Este tipo de movimiento requiere firma electrónica: nombre, documento y cargo',
        );
      }
    }

    const documento = await this.generarDocumento(empresaId, mov.tipo);
    const resultado = await this.prisma.$transaction(async (tx) => {
      const confirmado = await tx.movimiento.updateMany({
        where: { id: movimientoId, empresaId, estado: 'BORRADOR' },
        data: {
          estado: 'CONFIRMADO',
          documento,
          hashIntegridad: this.calcularHash(mov.id, mov.tipo, lineas),
          ...(requiereFirma
            ? {
                firmaNombre: firma!.nombre,
                firmaDocumento: firma!.documento,
                firmaCargo: firma!.cargo,
                firmaFecha: new Date(),
              }
            : {}),
        },
      });
      if (confirmado.count !== 1) {
        throw new BadRequestException('El movimiento ya fue confirmado o no pertenece a la empresa');
      }
      const movimientoConfirmado = await tx.movimiento.findUniqueOrThrow({
        where: { id: movimientoId },
      });
      for (const linea of lineas) {
        const activo = linea.activo;
        if (!activo) continue;
        const entra = (mov.tipo === 'ENTRADA' || mov.tipo === 'DEVOLUCION') ? linea.cantidad : 0;
        const sale = (mov.tipo === 'SALIDA' || mov.tipo === 'PRESTAMO') ? linea.cantidad : 0;
        const anterior = await tx.kardexEntry.findFirst({
          where: { empresaId, activoId: activo.id },
          orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
          select: { saldoDespues: true },
        });
        const saldoDespues = (anterior?.saldoDespues ?? 0) + entra - sale;
        await tx.kardexEntry.create({
          data: {
            empresaId, movimientoId, movimientoLineaId: linea.id,
            fechaEfectiva: mov.fechaEfectiva, activoId: activo.id,
            ubicacionId: mov.destinoId || activo.ubicacionId,
            clienteId: mov.clienteId || activo.clienteId,
            cantidadEntra: entra, cantidadSale: sale, saldoDespues,
            hashIntegridad: this.calcularHashKardex(
              movimientoConfirmado.id,
              linea.id,
              anterior?.saldoDespues ?? 0,
              saldoDespues,
              entra,
              sale,
            ),
          },
        });
        const nuevos = this.calcularNuevosEstados(mov.tipo);
        const estadoEsperado = (mov.tipo === 'SALIDA' || mov.tipo === 'PRESTAMO')
          ? 'DISPONIBLE'
          : (mov.tipo === 'DEVOLUCION' ? 'EN_CLIENTE' : undefined);
        const actualizado = await tx.activo.updateMany({
          where: {
            id: activo.id,
            empresaId,
            ...(estadoEsperado ? { estadoLogistico: estadoEsperado } : {}),
          },
          data: {
            estadoLogistico: nuevos.estadoLogistico || activo.estadoLogistico,
            ubicacionId: mov.destinoId || mov.origenId || activo.ubicacionId,
            clienteId: mov.clienteId || activo.clienteId,
          },
        });
        if (actualizado.count !== 1) {
          throw new BadRequestException(`El activo ${activo.codigo} ya no está disponible para este movimiento`);
        }
      }
      return movimientoConfirmado;
    });
    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'CONFIRMAR',
      entidad: 'movimiento',
      entidadId: movimientoId,
      detalles: JSON.stringify({ tipo: mov.tipo, documento: resultado.documento }),
    });
    return this.findById(empresaId, movimientoId);
  }
async revertir(empresaId: string, movimientoId: string, motivo: string, usuarioId: string) {
    const mov = await this.findById(empresaId, movimientoId);
    if (mov.estado !== 'CONFIRMADO')
      throw new BadRequestException('Solo revertir confirmados');
    if (await this.prisma.movimiento.findFirst({ where: { empresaId, correccionDeId: movimientoId } })) {
      throw new BadRequestException('El movimiento ya tiene una reversion');
    }
    const docRev = await this.generarDocumento(empresaId, 'REVERSION');
    const resultado = await this.prisma.$transaction(async (tx) => {
      for (const linea of mov.lineas) {
        if (!linea.activoId) continue;
        const original = mov.kardexEntries.find((entry) => entry.movimientoLineaId === linea.id);
        if (!original) continue;
        const ultimo = await tx.kardexEntry.findFirst({
          where: { empresaId, activoId: linea.activoId },
          orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
          select: { id: true },
        });
        if (ultimo?.id !== original.id) {
          throw new BadRequestException(
            `No se puede revertir ${mov.documento}: el activo tiene movimientos posteriores`,
          );
        }
      }

      const actualizado = await tx.movimiento.updateMany({
        where: { id: movimientoId, empresaId, estado: 'CONFIRMADO' },
        data: { estado: 'REVERTIDO' },
      });
      if (actualizado.count !== 1) {
        throw new BadRequestException('El movimiento ya fue revertido o no pertenece a la empresa');
      }
      const reversion = await tx.movimiento.create({
        data: { empresaId, tipo: 'REVERSION', documento: docRev,
          fechaEfectiva: new Date(), estado: 'CONFIRMADO',
          correccionDeId: movimientoId, motivoCorreccion: motivo,
          hashIntegridad: crypto.createHash('sha256').update(mov.id + motivo).digest('hex') },
      });

      for (const linea of mov.lineas) {
        const lineaReversion = await tx.movimientoLinea.create({
          data: {
            movimientoId: reversion.id,
            activoId: linea.activoId,
            poolErcolId: linea.poolErcolId,
            cantidad: linea.cantidad,
            estadoFisico: linea.estadoFisico,
            notas: `Reversion de ${mov.documento}`,
          },
        });
        if (!linea.activoId) continue;
        const original = mov.kardexEntries.find((entry) => entry.movimientoLineaId === linea.id);
        if (!original) continue;
        const anterior = await tx.kardexEntry.findFirst({
          where: {
            empresaId,
            activoId: linea.activoId,
            postedAt: { lt: original.postedAt },
          },
          orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
          include: { movimiento: true },
        });
        const saldoDespues = original.saldoDespues - original.cantidadEntra + original.cantidadSale;
        await tx.kardexEntry.create({
          data: {
            empresaId,
            movimientoId: reversion.id,
            movimientoLineaId: lineaReversion.id,
            fechaEfectiva: new Date(),
            activoId: linea.activoId,
            ubicacionId: anterior?.ubicacionId ?? null,
            clienteId: anterior?.clienteId ?? null,
            cantidadEntra: original.cantidadSale,
            cantidadSale: original.cantidadEntra,
            saldoDespues,
            hashIntegridad: this.calcularHashKardex(
              reversion.id,
              lineaReversion.id,
              original.saldoDespues,
              saldoDespues,
              original.cantidadSale,
              original.cantidadEntra,
            ),
          },
        });
        const estadoAnterior = this.estadoDesdeMovimiento(anterior?.movimiento.tipo);
        const restaurado = await tx.activo.updateMany({
          where: { id: linea.activoId, empresaId },
          data: {
            ...(estadoAnterior && { estadoLogistico: estadoAnterior }),
            ubicacionId: anterior?.ubicacionId ?? null,
            clienteId: anterior?.clienteId ?? null,
          },
        });
        if (restaurado.count !== 1) throw new NotFoundException('Activo no encontrado durante la reversion');
      }
      return reversion;
    });
    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'REVERTIR',
      entidad: 'movimiento',
      entidadId: movimientoId,
      detalles: JSON.stringify({ motivo, reversionId: resultado.id, documento: resultado.documento }),
    });
    return resultado;
  }

  private async validarLineas(empresaId: string, tipo: TipoMovimiento, lineas: any[], mov: any) {
    for (const linea of lineas) {
      const a = linea.activo;
      if (!a && !linea.poolErcolId) {
        throw new BadRequestException('La línea no tiene un activo válido');
      }
      if ((tipo === 'SALIDA' || tipo === 'PRESTAMO') && a) {
        if (!mov.clienteId) throw new BadRequestException('Se requiere cliente destino');
        await this.activosService.validarDisponible(empresaId, a.id);
        await this.clientesService.validarDespacho(empresaId, mov.clienteId, a.propiedad, linea.cantidad);
      }
      if (tipo === 'DEVOLUCION' && a && a.estadoLogistico !== 'EN_CLIENTE')
        throw new BadRequestException('Activo ' + a.codigo + ' no esta en cliente');
    }
  }

  private async generarDocumento(empresaId: string, tipo: string): Promise<string> {
    const sec = await this.prisma.secuenciaDocumento.upsert({
      where: { empresaId_tipo: { empresaId, tipo } },
      update: { ultimoNumero: { increment: 1 } },
      create: { empresaId, tipo, prefijo: this.obtenerPrefijo(tipo), ultimoNumero: 1 },
    });
    return sec.prefijo + '-' + String(sec.ultimoNumero).padStart(6, '0');
  }

  private obtenerPrefijo(tipo: string): string {
    const p: Record<string, string> = {
      ENTRADA: 'ENT', SALIDA: 'SAL', TRASLADO: 'TRA', DEVOLUCION: 'DEV',
      PRESTAMO: 'PRE', PERDIDA: 'PER', DANIO: 'DAN', REPARACION: 'REP',
      INVENTARIO_INICIAL: 'INV', AJUSTE: 'AJU', REVERSION: 'REV',
    };
    return p[tipo] || 'MOV';
  }

  private calcularHash(id: string, tipo: TipoMovimiento, lineas: any[]): string {
    const data = JSON.stringify({ id, tipo, lineas: lineas.map(l => l.activoId) });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private calcularHashKardex(
    movimientoId: string,
    lineaId: string,
    saldoAnterior: number,
    saldoDespues: number,
    cantidadEntra: number,
    cantidadSale: number,
  ): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({ movimientoId, lineaId, saldoAnterior, saldoDespues, cantidadEntra, cantidadSale }))
      .digest('hex');
  }

  private calcularNuevosEstados(tipo: TipoMovimiento): any {
    switch (tipo) {
      case 'ENTRADA': return { estadoLogistico: 'DISPONIBLE' as EstadoLogistico };
      case 'SALIDA': return { estadoLogistico: 'EN_CLIENTE' as EstadoLogistico };
      case 'DEVOLUCION': return { estadoLogistico: 'DISPONIBLE' as EstadoLogistico };
      case 'PRESTAMO': return { estadoLogistico: 'EN_CLIENTE' as EstadoLogistico };
      case 'TRASLADO': return {};
      case 'PERDIDA': return { estadoLogistico: 'PERDIDA' as EstadoLogistico };
      case 'DANIO': return { estadoOperativo: 'BLOQUEADO' as EstadoOperativo };
      case 'REPARACION': return { estadoLogistico: 'EN_REPARACION' as EstadoLogistico };
      default: return {};
    }
  }

  private estadoDesdeMovimiento(tipo?: TipoMovimiento): EstadoLogistico | undefined {
    switch (tipo) {
      case 'ENTRADA':
      case 'DEVOLUCION':
      case 'INVENTARIO_INICIAL':
      case 'AJUSTE':
        return 'DISPONIBLE';
      case 'SALIDA':
      case 'PRESTAMO':
        return 'EN_CLIENTE';
      case 'REPARACION':
        return 'EN_REPARACION';
      case 'PERDIDA':
        return 'PERDIDA';
      default:
        return undefined;
    }
  }
}