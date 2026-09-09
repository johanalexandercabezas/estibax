import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ActionInput {
  tipo: 'CREAR_CLIENTE' | 'CREAR_PLATAFORMA';
  nombre: string;
  email?: string;
  documento?: string;
}

@Injectable()
export class AsistenteService {
  constructor(private readonly prisma: PrismaService) {}

  async contexto(empresaId: string) {
    const [activos, clientes, operaciones, novedades, sedes, facturables, ultimosMovimientos] = await Promise.all([
      this.prisma.activo.groupBy({ by: ['propiedad', 'estadoLogistico'], where: { empresaId }, _count: { _all: true } }),
      this.prisma.cliente.findMany({ where: { empresaId }, select: { id: true, nombre: true, activo: true, email: true } }),
      this.prisma.operacion.count({ where: { empresaId } }),
      this.prisma.novedad.findMany({ where: { empresaId, estado: { not: 'CERRADA' } }, select: { id: true, descripcion: true, estado: true, activoId: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.sede.findMany({ where: { empresaId }, select: { id: true, nombre: true } }),
      this.prisma.clienteFacturable.findMany({ where: { empresaId, activo: true }, select: { id: true, nombre: true, tarifaDiaria: true } }),
      this.prisma.movimiento.findMany({ where: { empresaId }, select: { id: true, tipo: true, estado: true, documento: true, fechaEfectiva: true }, orderBy: { fechaEfectiva: 'desc' }, take: 20 }),
    ]);

    return {
      generadoEn: new Date().toISOString(),
      empresaId,
      resumen: {
        activos: activos.map((item) => ({ propiedad: item.propiedad, estado: item.estadoLogistico, cantidad: item._count._all })),
        totalClientes: clientes.length,
        totalOperaciones: operaciones,
        alertasAbiertas: novedades.length,
      },
      catalogos: {
        clientes,
        plataformas: sedes,
        clientesFacturables: facturables.map((item) => ({ ...item, tarifaDiaria: Number(item.tarifaDiaria) })),
      },
      alertas: novedades,
      movimientosRecientes: ultimosMovimientos,
    };
  }

  async ejecutar(empresaId: string, usuarioId: string, input: ActionInput) {
    const nombre = input.nombre?.trim();
    if (!nombre) throw new BadRequestException('El nombre es obligatorio');

    if (input.tipo === 'CREAR_PLATAFORMA') {
      const existente = await this.prisma.sede.findFirst({ where: { empresaId, nombre: { equals: nombre, mode: 'insensitive' } } });
      if (existente) throw new BadRequestException('La plataforma ya existe');
      const sede = await this.prisma.sede.create({ data: { empresaId, nombre } });
      return { tipo: input.tipo, id: sede.id, nombre: sede.nombre, creadoPor: usuarioId };
    }

    const existente = await this.prisma.cliente.findFirst({ where: { empresaId, nombre: { equals: nombre, mode: 'insensitive' } } });
    if (existente) throw new BadRequestException('El cliente ya existe');
    const cliente = await this.prisma.cliente.create({
      data: {
        empresaId,
        nombre,
        email: input.email?.trim() || null,
        documento: input.documento?.trim() || null,
        reglasJson: JSON.stringify({ puede_recibir_propias: true, puede_recibir_ercol: true, puede_recibir_tercero: false, cantidad_maxima: 100, requiere_aval: false }),
      },
    });
    return { tipo: input.tipo, id: cliente.id, nombre: cliente.nombre, creadoPor: usuarioId };
  }
}
