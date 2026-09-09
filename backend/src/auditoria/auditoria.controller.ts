import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Permisos('auditoria', 'read')
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos de auditoría de la empresa' })
  async listar(
    @CurrentUser('empresaId') empresaId: string,
    @Query() filters: { entidad?: string; accion?: string; limite?: string; desde?: string; hasta?: string; q?: string },
  ) {
    const fecha: { gte?: Date; lte?: Date } = {};
    if (filters.desde) fecha.gte = new Date(filters.desde);
    if (filters.hasta) fecha.lte = new Date(filters.hasta);
    return this.prisma.auditoria.findMany({
      where: {
        empresaId,
        ...(filters.entidad && { entidad: filters.entidad }),
        ...(filters.accion && { accion: filters.accion }),
        ...(Object.keys(fecha).length ? { createdAt: fecha } : {}),
        ...(filters.q && { detalles: { contains: filters.q, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limite ? Math.min(parseInt(filters.limite, 10), 200) : 50,
    });
  }
}
