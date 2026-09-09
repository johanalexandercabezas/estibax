import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { fechaNoFutura, validarRangoNoFuturo } from '../common/validation/dates';

export const TIPOS_DOCUMENTO = ['ORDEN_COMPRA', 'CARTA_DEVOLUCION'];

// Origen de la estiba (armonizado con Activo.propiedad: PROPIA = propia, ERCOL = Ercol).
// TERCERO se conserva solo como legado y no se ofrece en el grid nuevo.
export const ORIGENES_ESTIBA = ['PROPIA', 'ERCOL'];

// Formato del número de documento según tipo (10 caracteres obligatorios):
// - ORDEN_COMPRA:    documento "45" + 8 dígitos; manifiesto "61" + 8 dígitos
// - CARTA_DEVOLUCION: no usa número de documento; usa número de carta
export const PATRONES_DOCUMENTO: Record<string, { regex: RegExp; mensaje: string; ejemplo: string }> = {
  ORDEN_COMPRA: {
    regex: /^45\d{8}$/,
    mensaje: 'El número de orden de compra debe tener 10 dígitos y comenzar con 45',
    ejemplo: '4503846909',
  },
};

const PATRON_MANIFIESTO = /^61\d{8}$/;

function normalizar(valor?: string | null): string | null {
  const limpiado = valor?.trim();
  return limpiado ? limpiado.toUpperCase() : null;
}

@Injectable()
export class OperacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(empresaId: string, filtros?: any) {
    const where: any = { empresaId };

    if (filtros?.plataformaId) where.plataformaId = filtros.plataformaId;
    if (filtros?.clienteId) where.clienteId = filtros.clienteId;
    if (filtros?.tipoDocumento) where.tipoDocumento = filtros.tipoDocumento;
    if (filtros?.origen) where.origen = normalizar(filtros.origen);
    if (filtros?.ciudad) where.ciudad = normalizar(filtros.ciudad);

    if (filtros?.desde || filtros?.hasta) {
      const rango = validarRangoNoFuturo(filtros.desde, filtros.hasta);
      where.fecha = {};
      if (rango.inicio) where.fecha.gte = rango.inicio;
      if (rango.fin) where.fecha.lte = rango.fin;
    }

    // Búsqueda global por cliente, documento, manifiesto, ciudad o punto de entrega
    if (filtros?.q) {
      const q = filtros.q.trim();
      where.OR = [
        { numeroDocumento: { contains: q } },
        { manifiesto: { contains: q } },
        { ciudad: { contains: normalizar(q) ?? q } },
        { puntoEntrega: { contains: normalizar(q) ?? q } },
        { cartaDevolucion: { contains: q } },
        { cliente: { nombre: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const operaciones = await this.prisma.operacion.findMany({
      where,
      include: {
        plataforma: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
      },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });

    // Marcadores de duplicados para validación en tiempo real (advertencia, no bloqueo)
    const [docCounts, manCounts] = await Promise.all([
      this.prisma.operacion.groupBy({
        by: ['numeroDocumento'],
        where: { empresaId, tipoDocumento: 'ORDEN_COMPRA' },
        _count: true,
      }),
      this.prisma.operacion.groupBy({
        by: ['manifiesto'],
        where: { empresaId, manifiesto: { not: null } },
        _count: true,
      }),
    ]);
    const docFreq = new Map(docCounts.map((d) => [d.numeroDocumento, d._count]));
    const manFreq = new Map(manCounts.map((m) => [m.manifiesto as string, m._count]));

    return operaciones.map((o) => ({
      ...o,
      mes: o.fecha.getUTCMonth() + 1,
      duplicadoDocumento: (docFreq.get(o.numeroDocumento) ?? 0) > 1,
      duplicadoManifiesto: (o.manifiesto ? manFreq.get(o.manifiesto) ?? 0 : 0) > 1,
      completitud: this.calcularCompletitud(o),
    }));
  }

  async findById(empresaId: string, id: string) {
    const op = await this.prisma.operacion.findFirst({
      where: { id, empresaId },
      include: {
        plataforma: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
      },
    });
    if (!op) throw new NotFoundException('Operación no encontrada');
    return op;
  }

  async catalogo(empresaId: string) {
    const [clientes, plataformas, ciudades, puntos, manifiestos] = await Promise.all([
      this.prisma.cliente.findMany({
        where: { empresaId, activo: true },
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true },
      }),
      this.prisma.sede.findMany({
        where: { empresaId },
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true },
      }),
      this.prisma.operacion.findMany({
        where: { empresaId, ciudad: { not: null } },
        distinct: ['ciudad'],
        select: { ciudad: true },
        orderBy: { ciudad: 'asc' },
      }),
      this.prisma.operacion.findMany({
        where: { empresaId, puntoEntrega: { not: null } },
        distinct: ['puntoEntrega'],
        select: { puntoEntrega: true },
        orderBy: { puntoEntrega: 'asc' },
      }),
      this.prisma.operacion.findMany({
        where: { empresaId, manifiesto: { not: null } },
        distinct: ['manifiesto'],
        select: { manifiesto: true },
        orderBy: { manifiesto: 'asc' },
      }),
    ]);

    return {
      clientes,
      plataformas,
      ciudades: ciudades.map((c) => c.ciudad),
      puntos: puntos.map((p) => p.puntoEntrega),
      manifiestos: manifiestos.map((m) => m.manifiesto),
      tiposDocumento: TIPOS_DOCUMENTO,
    };
  }
  async crear(empresaId: string, data: any, usuarioId: string) {
    const opData = await this.validarYNormalizar(empresaId, data, null);
    const op = await this.prisma.operacion.create({ data: opData });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'CREAR_OPERACION',
      entidad: 'operacion',
      entidadId: op.id,
      detalles: JSON.stringify({
        numeroDocumento: op.numeroDocumento,
        tipoDocumento: op.tipoDocumento,
        manifiesto: op.manifiesto ?? null,
      }),
    });

    return this.findById(empresaId, op.id);
  }

  async actualizar(empresaId: string, id: string, data: any, usuarioId: string) {
    const existe = await this.prisma.operacion.findFirst({ where: { id, empresaId } });
    if (!existe) throw new NotFoundException('Operación no encontrada');

    const opData = await this.validarYNormalizar(empresaId, data, id);
    const op = await this.prisma.operacion.update({ where: { id }, data: opData });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'EDITAR_OPERACION',
      entidad: 'operacion',
      entidadId: id,
      detalles: JSON.stringify({ numeroDocumento: op.numeroDocumento }),
    });

    return this.findById(empresaId, op.id);
  }

  async eliminar(empresaId: string, id: string, usuarioId: string) {
    const existe = await this.prisma.operacion.findFirst({ where: { id, empresaId } });
    if (!existe) throw new NotFoundException('Operación no encontrada');

    await this.prisma.operacion.delete({ where: { id } });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'ELIMINAR_OPERACION',
      entidad: 'operacion',
      entidadId: id,
      detalles: JSON.stringify({ numeroDocumento: existe.numeroDocumento }),
    });

    return { eliminado: true, id };
  }

  private async validarYNormalizar(empresaId: string, data: any, idActual: string | null) {
    if (!data.fecha) throw new BadRequestException('La fecha es obligatoria');
    const fecha = fechaNoFutura(data.fecha, 'Fecha de operación');

    const tipoDocumento = normalizar(data.tipoDocumento) ?? 'ORDEN_COMPRA';
    if (!TIPOS_DOCUMENTO.includes(tipoDocumento)) {
      throw new BadRequestException(`Tipo de documento no válido: ${tipoDocumento}`);
    }

    // Origen de la estiba: solo PROPIA (Propia) o ERCOL (Ercol), igual que Activo.propiedad.
    const origen = normalizar(data.origen) ?? 'PROPIA';
    if (!ORIGENES_ESTIBA.includes(origen)) {
      throw new BadRequestException(`Origen de estiba no válido: ${data.origen} (use Propia o Ercol)`);
    }

    // Según el tipo de documento solo aplican ciertas columnas:
    // - ORDEN_COMPRA (entrega):     manifiesto + entregadas
    // - CARTA_DEVOLUCION (devolución): carta de devolución + devueltas
    // Las columnas que no aplican se fuerzan a 0/null para no contaminar el dato.
    const esOrdenCompra = tipoDocumento === 'ORDEN_COMPRA';

    const numeroDocumento = esOrdenCompra ? data.numeroDocumento?.trim() : '';
    if (esOrdenCompra && !numeroDocumento) {
      throw new BadRequestException('El número de orden de compra es obligatorio');
    }

    // Formato obligatorio según tipo de documento (10 caracteres + prefijo)
    const patron = PATRONES_DOCUMENTO[tipoDocumento];
    if (patron && !patron.regex.test(numeroDocumento)) {
      throw new BadRequestException(`${patron.mensaje} (ejemplo: ${patron.ejemplo})`);
    }

    // Duplicado estricto de orden de compra (mismo nº) dentro de la empresa
    if (tipoDocumento === 'ORDEN_COMPRA') {
      const dup = await this.prisma.operacion.findFirst({
        where: {
          empresaId,
          tipoDocumento: 'ORDEN_COMPRA',
          numeroDocumento,
          ...(idActual ? { id: { not: idActual } } : {}),
        },
      });
      if (dup) {
        throw new BadRequestException(`El número de orden ${numeroDocumento} ya está registrado`);
      }
    }

    const entregadas = Number(data.entregadas ?? 0);
    const devueltas = Number(data.devueltas ?? 0);
    if (!Number.isInteger(entregadas) || entregadas < 0) {
      throw new BadRequestException('Cantidad entregadas inválida (entero ≥ 0)');
    }
    if (!Number.isInteger(devueltas) || devueltas < 0) {
      throw new BadRequestException('Cantidad devueltas inválida (entero ≥ 0)');
    }

    const cartaDevolucion = data.cartaDevolucion?.trim();
    if (!esOrdenCompra && !cartaDevolucion) {
      throw new BadRequestException('El número de carta de devolución es obligatorio');
    }
    const manifiesto = esOrdenCompra ? data.manifiesto?.trim() : null;
    if (esOrdenCompra && !manifiesto) {
      throw new BadRequestException('El manifiesto es obligatorio para una orden de compra');
    }
    if (esOrdenCompra && !PATRON_MANIFIESTO.test(manifiesto)) {
      throw new BadRequestException('El manifiesto debe tener 10 dígitos y comenzar con 61 (ejemplo: 6103846909)');
    }

    return {
      fecha,
      empresaId,
      tipoDocumento,
      origen,
      numeroDocumento,
      plataformaId: data.plataformaId ?? null,
      clienteId: data.clienteId ?? null,
      ciudad: normalizar(data.ciudad),
      puntoEntrega: normalizar(data.puntoEntrega),
      manifiesto,
      entregadas: esOrdenCompra ? entregadas : 0,
      cartaDevolucion: !esOrdenCompra ? (cartaDevolucion || null) : null,
      devueltas: !esOrdenCompra ? devueltas : 0,
      notas: data.notas?.trim() || null,
    };
  }

  private calcularCompletitud(o: any): number {
    const identificador = o.tipoDocumento === 'CARTA_DEVOLUCION' ? o.cartaDevolucion : o.numeroDocumento;
    const obligatorios = [o.fecha, o.plataformaId, o.clienteId, identificador];
    const presentes = obligatorios.filter((v) => Boolean(v)).length;
    return Math.round((presentes / obligatorios.length) * 100);
  }
}

