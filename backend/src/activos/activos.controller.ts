import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivosService } from './activos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Activos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activos')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @Get()
  @Permisos('activos', 'read')
  @ApiOperation({ summary: 'Listar activos con filtros' })
  findAll(@CurrentUser('empresaId') empresaId: string, @Query() filters: any) {
    return this.activosService.findAll(empresaId, filters);
  }

  @Get('tipos')
  @Permisos('activos', 'read')
  @ApiOperation({ summary: 'Listar tipos de activo' })
  findTipos() {
    return this.activosService.findTipos();
  }

  @Get('siguiente-codigo')
  @Permisos('activos', 'read')
  @ApiOperation({ summary: 'Siguiente código consecutivo de activo (EST-NNNNNN)' })
  siguienteCodigo(@CurrentUser('empresaId') empresaId: string) {
    return this.activosService.siguienteCodigo(empresaId);
  }

  @Get('codigo/:codigo')
  @Permisos('activos', 'read')
  @ApiOperation({ summary: 'Buscar activo por código' })
  findByCodigo(@CurrentUser('empresaId') empresaId: string, @Param('codigo') codigo: string) {
    return this.activosService.findByCodigo(empresaId, codigo);
  }

  @Get(':id')
  @Permisos('activos', 'read')
  @ApiOperation({ summary: 'Ficha 360° del activo' })
  findById(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.activosService.findById(empresaId, id);
  }

  @Post()
  @Permisos('activos', 'write')
  @ApiOperation({ summary: 'Registrar un activo' })
  create(@CurrentUser('empresaId') empresaId: string, @Body() data: any) {
    return this.activosService.create(empresaId, data);
  }

  @Put(':id')
  @Permisos('activos', 'write')
  @ApiOperation({ summary: 'Actualizar un activo' })
  update(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.activosService.update(empresaId, id, data);
  }

  @Post(':id/bloquear')
  @Permisos('activos', 'write')
  @ApiOperation({ summary: 'Bloquear un activo' })
  bloquear(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.activosService.bloquear(empresaId, id, usuarioId);
  }

  @Post(':id/desbloquear')
  @Permisos('liberaciones', 'LIBERAR_ACTIVO')
  @ApiOperation({ summary: 'Desbloquear un activo (requiere permiso LIBERAR_ACTIVO)' })
  desbloquear(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.activosService.desbloquear(empresaId, id, usuarioId);
  }
}