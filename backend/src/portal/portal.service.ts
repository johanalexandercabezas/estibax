import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  private asegurarCliente(clienteId: string | null | undefined) {
    if (!clienteId) {
      throw new ForbiddenException(
        'Su usuario no está vinculado a un cliente. El portal es de solo lectura para clientes.',
      );
    }
    return clienteId;
  }

  async misActivos(empresaId: string, clienteId?: string | null) {
    const cid = this.asegurarCliente(clienteId);
    return this.prisma.activo.findMany({
      where: { empresaId, clienteId: cid },
      include: { tipoActivo: true, ubicacion: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async misMovimientos(empresaId: string, clienteId?: string | null) {
    const cid = this.asegurarCliente(clienteId);
    return this.prisma.movimiento.findMany({
      where: { empresaId, clienteId: cid, estado: 'CONFIRMADO' },
      include: { lineas: { include: { activo: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async miBalance(empresaId: string, clienteId?: string | null) {
    const cid = this.asegurarCliente(clienteId);

    const lineas = await this.prisma.movimientoLinea.findMany({
      where: {
        movimiento: {
          empresaId,
          clienteId: cid,
          estado: 'CONFIRMADO',
          tipo: { in: ['SALIDA', 'PRESTAMO', 'DEVOLUCION'] },
        },
      },
      include: { activo: true },
    });

    const movimientos = await this.prisma.movimiento.findMany({
      where: {
        empresaId,
        clienteId: cid,
        estado: 'CONFIRMADO',
        tipo: { in: ['SALIDA', 'PRESTAMO', 'DEVOLUCION'] },
      },
      select: { id: true, tipo: true },
    });
    const tipoPorMov = new Map(movimientos.map((m) => [m.id, m.tipo]));

    let entregadas = 0;
    let devueltas = 0;
    for (const l of lineas) {
      if (!l.activo) continue;
      const tipo = tipoPorMov.get(l.movimientoId);
      if (tipo === 'SALIDA' || tipo === 'PRESTAMO') entregadas += l.cantidad;
      else if (tipo === 'DEVOLUCION') devueltas += l.cantidad;
    }

    const enCustodia = await this.prisma.activo.count({
      where: { empresaId, clienteId: cid, estadoLogistico: 'EN_CLIENTE' },
    });

    return {
      clienteId: cid,
      enCustodia,
      entregadas,
      devueltas,
      pendientes: Math.max(0, entregadas - devueltas),
    };
  }
}