import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OperacionesService } from './operaciones.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Operaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operaciones')
export class OperacionesController {
  constructor(private readonly operacionesService: OperacionesService) {}

  @Get('catalogo')
  @Permisos('movimientos', 'read')
  @ApiOperation({ summary: 'Catálogos para el data grid: clientes, plataformas, ciudades, puntos, manifiestos' })
  catalogo(@CurrentUser('empresaId') empresaId: string) {
    return this.operacionesService.catalogo(empresaId);
  }

  @Get()
  @Permisos('movimientos', 'read')
  @ApiOperation({ summary: 'Listar operaciones con filtros y búsqueda' })
  findAll(@CurrentUser('empresaId') empresaId: string, @Query() filtros: any) {
    return this.operacionesService.findAll(empresaId, filtros);
  }

  @Get(':id')
  @Permisos('movimientos', 'read')
  @ApiOperation({ summary: 'Detalle de una operación' })
  findById(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.operacionesService.findById(empresaId, id);
  }

  @Post()
  @Permisos('movimientos', 'write')
  @ApiOperation({ summary: 'Crear operación (una fila del grid)' })
  crear(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: any,
  ) {
    return this.operacionesService.crear(empresaId, data, usuarioId);
  }

  @Put(':id')
  @Permisos('movimientos', 'write')
  @ApiOperation({ summary: 'Actualizar operación' })
  actualizar(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.operacionesService.actualizar(empresaId, id, data, usuarioId);
  }

  @Delete(':id')
  @Permisos('movimientos', 'write')
  @ApiOperation({ summary: 'Eliminar operación' })
  eliminar(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.operacionesService.eliminar(empresaId, id, usuarioId);
  }
}