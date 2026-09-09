import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MovimientosService } from './movimientos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Movimientos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('movimientos')
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Get()
  @Permisos('movimientos', 'read')
  @ApiOperation({ summary: 'Listar movimientos' })
  findAll(@CurrentUser('empresaId') empresaId: string, @Query() filters: any) {
    return this.movimientosService.findAll(empresaId, filters);
  }

  @Get(':id')
  @Permisos('movimientos', 'read')
  @ApiOperation({ summary: 'Ver detalle de un movimiento' })
  findById(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.movimientosService.findById(empresaId, id);
  }

  @Post()
  @Permisos('movimientos', 'write')
  @ApiOperation({ summary: 'Crear movimiento en borrador' })
  @ApiBody({ type: Object, description: 'Movimiento con líneas (activoId, cantidad)' })
  create(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: any,
  ) {
    return this.movimientosService.crearBorrador(empresaId, data, usuarioId);
  }

  @Post(':id/confirmar')
  @Permisos('movimientos', 'write')
  @ApiOperation({ summary: 'Confirmar movimiento (genera documento y registro en Kardex)' })
  confirmar(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: { firma?: { nombre?: string; documento?: string; cargo?: string } },
  ) {
    return this.movimientosService.confirmar(empresaId, id, usuarioId, data?.firma);
  }

  @Post(':id/revertir')
  @Permisos('movimientos', 'write')
  @ApiOperation({ summary: 'Revertir movimiento confirmado' })
  revertir(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    if (!motivo) throw new BadRequestException('Debe indicar un motivo');
    return this.movimientosService.revertir(empresaId, id, motivo, usuarioId);
  }
}