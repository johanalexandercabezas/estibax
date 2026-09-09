import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @Permisos('clientes', 'read')
  @ApiOperation({ summary: 'Listar clientes de la empresa' })
  findAll(@CurrentUser('empresaId') empresaId: string) {
    return this.clientesService.findAll(empresaId);
  }

  @Get(':id')
  @Permisos('clientes', 'read')
  @ApiOperation({ summary: 'Ver detalle de un cliente' })
  findById(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.clientesService.findById(empresaId, id);
  }

  @Get(':id/balance-devoluciones')
  @Permisos('clientes', 'read')
  @ApiOperation({
    summary: 'Obligación de devolución: entregadas - devueltas = pendientes',
  })
  balanceDevoluciones(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.clientesService.obtenerBalanceDevolucion(empresaId, id);
  }

  @Post()
  @Permisos('clientes', 'write')
  @ApiOperation({ summary: 'Crear un cliente' })
  create(@CurrentUser('empresaId') empresaId: string, @Body() data: any) {
    return this.clientesService.create(empresaId, data);
  }

  @Put(':id')
  @Permisos('clientes', 'write')
  @ApiOperation({ summary: 'Actualizar un cliente' })
  update(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.clientesService.update(empresaId, id, data);
  }
}