import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: {
    empresaId: string;
    usuarioId?: string;
    accion: string;
    entidad: string;
    entidadId?: string;
    detalles?: string;
    ip?: string;
    userAgent?: string;
  }) {
    await this.prisma.auditoria.create({
      data: {
        empresaId: params.empresaId,
        usuarioId: params.usuarioId,
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId,
        detalles: params.detalles,
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
  }
}