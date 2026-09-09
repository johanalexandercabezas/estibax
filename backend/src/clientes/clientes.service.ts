import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ReglasDespacho {
  puede_recibir_propias: boolean;
  puede_recibir_ercol: boolean;
  puede_recibir_tercero: boolean;
  cantidad_maxima: number;
  requiere_aval: boolean;
}

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(empresaId: string) {
    return this.prisma.cliente.findMany({
      where: { empresaId },
      include: { _count: { select: { activosCustodia: true } } },
    });
  }

  async findById(empresaId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
      include: { _count: { select: { activosCustodia: true } } },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async create(empresaId: string, data: any) {
    return this.prisma.cliente.create({
      data: {
        empresaId,
        nombre: data.nombre?.trim(),
        documento: data.documento?.trim() || null,
        email: data.email?.trim() || null,
        telefono: data.telefono?.trim() || null,
        direccion: data.direccion?.trim() || null,
        reglasJson: data.reglasJson,
      },
    });
  }

  async update(empresaId: string, clienteId: string, data: any) {
    await this.findById(empresaId, clienteId);
    const result = await this.prisma.cliente.updateMany({
      where: { id: clienteId, empresaId },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
        ...(data.documento !== undefined && { documento: data.documento?.trim() || null }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.telefono !== undefined && { telefono: data.telefono?.trim() || null }),
        ...(data.direccion !== undefined && { direccion: data.direccion?.trim() || null }),
        ...(data.reglasJson !== undefined && { reglasJson: data.reglasJson }),
        ...(data.activo !== undefined && { activo: Boolean(data.activo) }),
      },
    });
    if (result.count !== 1) throw new NotFoundException('Cliente no encontrado');
    return this.findById(empresaId, clienteId);
  }

  parseReglasDespacho(cliente: any): ReglasDespacho {
    return JSON.parse(cliente.reglasJson);
  }

  async validarDespacho(empresaId: string, clienteId: string, propiedad: string, cantidad: number) {
    const cliente = await this.findById(empresaId, clienteId);
    if (!cliente.activo) {
      throw new BadRequestException('El cliente está inactivo');
    }

    const reglas: ReglasDespacho = this.parseReglasDespacho(cliente);

    if (propiedad === 'PROPIA' && !reglas.puede_recibir_propias) {
      throw new BadRequestException('El cliente no puede recibir estibas propias');
    }
    if (propiedad === 'ERCOL' && !reglas.puede_recibir_ercol) {
      throw new BadRequestException('El cliente no puede recibir estibas ERCOL');
    }
    if (propiedad === 'TERCERO' && !reglas.puede_recibir_tercero) {
      throw new BadRequestException('El cliente no puede recibir estibas de terceros');
    }

    const enCustodia = await this.prisma.activo.count({
      where: { clienteId, estadoLogistico: 'EN_CLIENTE', empresaId },
    });

    if (enCustodia + cantidad > reglas.cantidad_maxima) {
      throw new BadRequestException(
        `El cliente excedería su límite máximo de ${reglas.cantidad_maxima} estibas (actual: ${enCustodia}, solicitado: ${cantidad})`,
      );
    }

    return { valido: true, reglas, enCustodia };
  }

  /**
   * Obligación de devolución automática (decisión estructural #2):
   * entregadas - devueltas = pendientes, por cliente y opcionalmente por propiedad.
   * Solo considera movimientos CONFIRMADOS (los revertidos quedan fuera).
   * Entregan: SALIDA y PRESTAMO. Devuelven: DEVOLUCION.
   */
  async obtenerBalanceDevolucion(empresaId: string, clienteId: string) {
    await this.findById(empresaId, clienteId);

    const lineas = await this.prisma.movimientoLinea.findMany({
      where: {
        movimiento: {
          empresaId,
          clienteId,
          estado: 'CONFIRMADO',
          tipo: { in: ['SALIDA', 'PRESTAMO', 'DEVOLUCION'] },
        },
      },
      include: { activo: true },
    });

    const porPropiedad = new Map<string, { entregadas: number; devueltas: number }>();

    // Necesitamos el tipo de cada movimiento por linea agrupado en una sola consulta.
    const movimientos = await this.prisma.movimiento.findMany({
      where: {
        empresaId,
        clienteId,
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
      const clave = l.activo.propiedad;
      const fila =
        porPropiedad.get(clave) ?? (porPropiedad.set(clave, { entregadas: 0, devueltas: 0 }), porPropiedad.get(clave)!);
      if (tipo === 'SALIDA' || tipo === 'PRESTAMO') {
        entregadas += l.cantidad;
        fila.entregadas += l.cantidad;
      } else if (tipo === 'DEVOLUCION') {
        devueltas += l.cantidad;
        fila.devueltas += l.cantidad;
      }
    }

    const desglose = Array.from(porPropiedad.entries()).map(([propiedad, v]) => ({
      propiedad,
      entregadas: v.entregadas,
      devueltas: v.devueltas,
      pendientes: Math.max(0, v.entregadas - v.devueltas),
    }));

    return {
      clienteId,
      entregadas,
      devueltas,
      pendientes: Math.max(0, entregadas - devueltas),
      cumple: entregadas - devueltas <= 0,
      porPropiedad: desglose,
    };
  }
}