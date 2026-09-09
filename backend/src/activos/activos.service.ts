import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Propiedad, EstadoFisico, EstadoLogistico, EstadoOperativo } from '@prisma/client';

@Injectable()
export class ActivosService {
  constructor(private readonly prisma: PrismaService) {}

  async findTipos() {
    return this.prisma.tipoActivo.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findAll(empresaId: string, filters?: any) {
    // Filtro por sede: resuelve todas las zonas de la sede y filtra por ubicación
    let ubicacionFilter: any;
    if (filters?.sedeId) {
      const zonas = await this.prisma.zona.findMany({
        where: { bodega: { planta: { sedeId: filters.sedeId, sede: { empresaId } } } },
        select: { id: true },
      });
      ubicacionFilter = { in: zonas.map((z) => z.id) };
    }

    return this.prisma.activo.findMany({
      where: {
        empresaId,
        ...(ubicacionFilter && { ubicacionId: ubicacionFilter }),
        ...(filters?.estadoFisico && { estadoFisico: filters.estadoFisico }),
        ...(filters?.estadoLogistico && { estadoLogistico: filters.estadoLogistico }),
        ...(filters?.estadoOperativo && { estadoOperativo: filters.estadoOperativo }),
        ...(filters?.propiedad && { propiedad: filters.propiedad }),
        ...(filters?.clienteId && { clienteId: filters.clienteId }),
        ...(filters?.ubicacionId && { ubicacionId: filters.ubicacionId }),
      },
      include: {
        tipoActivo: true,
        cliente: true,
        ubicacion: {
          include: { bodega: { include: { planta: { include: { sede: true } } } } },
        },
      },
    });
  }

  async findById(empresaId: string, activoId: string) {
    const activo = await this.prisma.activo.findFirst({
      where: { id: activoId, empresaId },
      include: {
        tipoActivo: true,
        ubicacion: { include: { bodega: { include: { planta: { include: { sede: true } } } } } },
        cliente: true,
        // Ficha 360°: historial de movimientos (via líneas), novedades y asientos kardex
        lineas: {
          include: {
            movimiento: { include: { cliente: true } },
          },
          orderBy: { movimiento: { fechaEfectiva: 'desc' } },
        },
        novedades: { orderBy: { fecha: 'desc' } },
        kardexEntries: { orderBy: { postedAt: 'desc' } },
      },
    });
    if (!activo) throw new NotFoundException('Activo no encontrado');
    return activo;
  }

  async findByCodigo(empresaId: string, codigo: string) {
    const activo = await this.prisma.activo.findFirst({
      where: { empresaId, codigo },
      include: { tipoActivo: true, ubicacion: true, cliente: true },
    });
    if (!activo) throw new NotFoundException('Activo no encontrado');
    return activo;
  }

  async siguienteCodigo(empresaId: string) {
    const todos = await this.prisma.activo.findMany({
      where: { empresaId, codigo: { startsWith: 'EST-' } },
      select: { codigo: true },
    });
    let max = 0;
    for (const c of todos) {
      const n = Number(c.codigo.split('-')[1]);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return { codigo: `EST-${String(max + 1).padStart(6, '0')}` };
  }

  async create(empresaId: string, data: any) {
    await this.validarReferencias(empresaId, data.ubicacionId, data.clienteId);
    // Generación consecutiva automática del código si no se envía (punto 3/14).
    let codigo = data.codigo?.trim();
    if (!codigo) {
      const prefijo = data.propiedad === 'ERCOL' ? 'ERCOL' : 'PROPIA';
      codigo = `${prefijo}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    }
    // Validar que el código no exista ya
    const existe = await this.prisma.activo.findFirst({ where: { empresaId, codigo } });
    if (existe) throw new BadRequestException(`El código ${codigo} ya está en uso`);

    return this.prisma.activo.create({
      data: {
        empresaId,
        codigo,
        tipoActivoId: data.tipoActivoId,
        propiedad: data.propiedad,
        valorAdquisicion: data.valorAdquisicion,
        valorReposicion: data.valorReposicion,
        ubicacionId: data.ubicacionId,
        clienteId: data.clienteId,
        estadoFisico: data.estadoFisico || 'BUENO',
        estadoLogistico: data.estadoLogistico || 'DISPONIBLE',
        estadoOperativo: data.estadoOperativo || 'LIBRE',
        qrHash: data.qrHash,
      },
    });
  }

  async update(empresaId: string, activoId: string, data: any) {
    await this.findById(empresaId, activoId);

    if (data.estadoOperativo === 'BLOQUEADO') {
      throw new BadRequestException('Usa el endpoint de bloqueo para bloquear activos');
    }
    await this.validarReferencias(empresaId, data.ubicacionId, data.clienteId);

    const allowedFields = [
      'tipoActivoId', 'propiedad', 'valorAdquisicion', 'valorReposicion',
      'ubicacionId', 'clienteId', 'estadoFisico', 'estadoLogistico', 'qrHash',
    ] as const;
    const safeData = Object.fromEntries(
      allowedFields
        .filter((field) => data[field] !== undefined)
        .map((field) => [field, data[field]]),
    );

    const result = await this.prisma.activo.updateMany({
      where: { id: activoId, empresaId },
      data: safeData,
    });
    if (result.count !== 1) throw new NotFoundException('Activo no encontrado');
    return this.findById(empresaId, activoId);
  }

  async bloquear(empresaId: string, activoId: string, usuarioId: string) {
    const activo = await this.findById(empresaId, activoId);
    if (activo.estadoOperativo === 'BLOQUEADO') {
      throw new BadRequestException('El activo ya está bloqueado');
    }

    const result = await this.prisma.activo.updateMany({
      where: { id: activoId, empresaId },
      data: { estadoOperativo: 'BLOQUEADO' },
    });
    if (result.count !== 1) throw new NotFoundException('Activo no encontrado');
    return this.findById(empresaId, activoId);
  }

  async desbloquear(empresaId: string, activoId: string, usuarioId: string) {
    const activo = await this.findById(empresaId, activoId);
    if (activo.estadoOperativo !== 'BLOQUEADO') {
      throw new BadRequestException('El activo no está bloqueado');
    }

    const result = await this.prisma.activo.updateMany({
      where: { id: activoId, empresaId },
      data: { estadoOperativo: 'LIBRE' },
    });
    if (result.count !== 1) throw new NotFoundException('Activo no encontrado');
    return this.findById(empresaId, activoId);
  }

  async validarDisponible(empresaId: string, activoId: string) {
    const activo = await this.findById(empresaId, activoId);

    if (activo.estadoOperativo === 'BLOQUEADO') {
      throw new BadRequestException('El activo está bloqueado y no puede despacharse');
    }
    if (activo.estadoLogistico !== 'DISPONIBLE') {
      throw new BadRequestException(
        `El activo no está disponible (estado: ${activo.estadoLogistico})`,
      );
    }
    if (activo.estadoFisico === 'CRITICO') {
      throw new BadRequestException('El activo tiene daño crítico y no puede despacharse');
    }

    return activo;
  }

  private async validarReferencias(empresaId: string, ubicacionId?: string | null, clienteId?: string | null) {
    if (ubicacionId) {
      const ubicacion = await this.prisma.zona.findFirst({
        where: { id: ubicacionId, bodega: { planta: { sede: { empresaId } } } },
      });
      if (!ubicacion) throw new BadRequestException('La ubicación no pertenece a la empresa');
    }
    if (clienteId) {
      const cliente = await this.prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
      if (!cliente) throw new BadRequestException('El cliente no pertenece a la empresa');
    }
  }
}