import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EstadoNovedad, DisposicionNovedad, EstadoFisico } from '@prisma/client';
import { fechaNoFutura } from '../common/validation/dates';

@Injectable()
export class NovedadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(empresaId: string, filters?: any) {
    return this.prisma.novedad.findMany({
      where: {
        empresaId,
        ...(filters?.estado && { estado: filters.estado }),
        ...(filters?.disposicion && { disposicion: filters.disposicion }),
      },
      include: {
        activo: {
          include: {
            tipoActivo: true,
            ubicacion: { include: { bodega: { include: { planta: { include: { sede: true } } } } } },
          },
        },
        cliente: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(empresaId: string, novedadId: string) {
    const novedad = await this.prisma.novedad.findFirst({
      where: { id: novedadId, empresaId },
      include: {
        activo: { include: { tipoActivo: true, ubicacion: true, cliente: true } },
        movimiento: true,
        cliente: true,
      },
    });
    if (!novedad) throw new NotFoundException('Novedad no encontrada');
    return novedad;
  }

  /**
   * Reportar daño/novedad sobre un activo.
   * Efecto automático (regla 7.6): el activo queda BLOQUEADO.
   * Estado físico pasa a DAÑADO o CRITICO según el nivel reportado.
   */
  async crear(empresaId: string, data: any, usuarioId: string) {
    if (!data.activoId) throw new BadRequestException('Se requiere activoId');
    const activo = await this.prisma.activo.findFirst({
      where: { id: data.activoId, empresaId },
    });
    if (!activo) throw new NotFoundException('Activo no encontrado');

    const estadoFisico: EstadoFisico =
      data.estadoFisico === 'CRITICO' ? 'CRITICO' : 'DANADO';

    const resultado = await this.prisma.$transaction(async (tx) => {
      const novedad = await tx.novedad.create({
        data: {
          empresaId,
          activoId: activo.id,
          movimientoId: data.movimientoId ?? null,
          clienteId: data.clienteId ?? activo.clienteId ?? null,
          ubicacionId: data.ubicacionId ?? activo.ubicacionId ?? null,
          fecha: fechaNoFutura(data.fecha, 'Fecha de novedad'),
          reportanteId: usuarioId,
          descripcion: data.descripcion,
          estado: 'ABIERTA',
        },
      });

      await tx.activo.update({
        where: { id: activo.id },
        data: {
          estadoFisico,
          estadoOperativo: 'BLOQUEADO',
        },
      });

      return novedad;
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'CREAR_NOVEDAD',
      entidad: 'novedad',
      entidadId: resultado.id,
      detalles: JSON.stringify({
        activoId: activo.id,
        codigo: activo.codigo,
        estadoFisico,
        bloqueado: true,
      }),
    });

    return this.findById(empresaId, resultado.id);
  }

  async investigar(
    empresaId: string,
    novedadId: string,
    data: { causa?: string; responsable?: string },
    usuarioId: string,
  ) {
    const novedad = await this.findById(empresaId, novedadId);
    if (novedad.estado === 'CERRADA')
      throw new BadRequestException('La novedad ya está cerrada');

    const actualizada = await this.prisma.novedad.update({
      where: { id: novedadId },
      data: {
        estado: 'EN_INVESTIGACION',
        causa: data.causa ?? novedad.causa,
        responsable: data.responsable ?? novedad.responsable,
      },
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'INVESTIGAR_NOVEDAD',
      entidad: 'novedad',
      entidadId: novedadId,
      detalles: JSON.stringify({ causa: data.causa, responsable: data.responsable }),
    });

    return actualizada;
  }

  /**
   * Resolver con disposición:
   *  REPARACION → activo pasa a EN_REPARACION (sigue bloqueado).
   *  BAJA       → activo pasa a BAJA (estado logístico final).
   *  INDEMNIZACION → se registra el valor de indemnización (valor de reposición como base).
   */
  async resolver(
    empresaId: string,
    novedadId: string,
    data: {
      disposicion: DisposicionNovedad;
      valor?: number;
      indemnizacion?: number;
    },
    usuarioId: string,
  ) {
    const novedad = await this.findById(empresaId, novedadId);
    if (novedad.estado === 'CERRADA')
      throw new BadRequestException('La novedad ya está cerrada');
    if (!data.disposicion)
      throw new BadRequestException('Debe indicar una disposición');

    const activo = novedad.activo;

    await this.prisma.$transaction(async (tx) => {
      await tx.novedad.update({
        where: { id: novedadId },
        data: {
          disposicion: data.disposicion,
          valor: data.valor ?? undefined,
          indemnizacion:
            data.disposicion === 'INDEMNIZACION'
              ? data.indemnizacion ?? data.valor
              : undefined,
        },
      });

      if (data.disposicion === 'REPARACION') {
        await tx.activo.update({
          where: { id: activo.id },
          data: { estadoLogistico: 'EN_REPARACION' },
        });
      } else if (data.disposicion === 'BAJA') {
        await tx.activo.update({
          where: { id: activo.id },
          data: { estadoLogistico: 'BAJA' },
        });
      }
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'RESOLVER_NOVEDAD',
      entidad: 'novedad',
      entidadId: novedadId,
      detalles: JSON.stringify({
        disposicion: data.disposicion,
        valor: data.valor,
        indemnizacion: data.indemnizacion,
      }),
    });

    return this.findById(empresaId, novedadId);
  }

  /**
   * Inspección humana obligatoria (regla 7.7): solo un humano autorizado
   * puede cerrar la reparación y devolver el activo a BUENO / LIBRE / DISPONIBLE.
   */
  async completarReparacion(empresaId: string, novedadId: string, usuarioId: string) {
    const novedad = await this.findById(empresaId, novedadId);
    if (novedad.disposicion !== 'REPARACION')
      throw new BadRequestException('La novedad debe estar dispuesta a REPARACION');

    await this.prisma.$transaction(async (tx) => {
      await tx.novedad.update({
        where: { id: novedadId },
        data: { estado: 'CERRADA' },
      });

      await tx.activo.update({
        where: { id: novedad.activoId },
        data: {
          estadoFisico: 'BUENO',
          estadoLogistico: 'DISPONIBLE',
          estadoOperativo: 'LIBRE',
        },
      });
    });

    await this.auditoriaService.registrar({
      empresaId,
      usuarioId,
      accion: 'INSPECCION_HUMANA',
      entidad: 'novedad',
      entidadId: novedadId,
      detalles: JSON.stringify({
        activoId: novedad.activoId,
        resultado: 'BUENO / LIBRE / DISPONIBLE',
      }),
    });

    return this.findById(empresaId, novedadId);
  }
}