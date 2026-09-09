import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NovedadesService } from './novedades.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Novedades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('novedades')
export class NovedadesController {
  constructor(private readonly novedadesService: NovedadesService) {}

  @Get()
  @Permisos('novedades', 'read')
  @ApiOperation({ summary: 'Listar novedades del expediente' })
  findAll(@CurrentUser('empresaId') empresaId: string, @Query() filters: any) {
    return this.novedadesService.findAll(empresaId, filters);
  }

  @Get(':id')
  @Permisos('novedades', 'read')
  @ApiOperation({ summary: 'Ver detalle de una novedad' })
  findById(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.novedadesService.findById(empresaId, id);
  }

  @Post()
  @Permisos('novedades', 'write')
  @ApiOperation({
    summary: 'Reportar daño/novedad (bloquea el activo automáticamente)',
  })
  crear(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() data: any,
  ) {
    return this.novedadesService.crear(empresaId, data, usuarioId);
  }

  @Post(':id/investigar')
  @Permisos('novedades', 'write')
  @ApiOperation({ summary: 'Registrar investigación: causa y responsable' })
  investigar(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() data: { causa?: string; responsable?: string },
  ) {
    return this.novedadesService.investigar(empresaId, id, data, usuarioId);
  }

  @Post(':id/resolver')
  @Permisos('novedades', 'write')
  @ApiOperation({
    summary: 'Resolver disposición: REPARACION | INDEMNIZACION | BAJA',
  })
  resolver(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body()
    data: {
      disposicion: 'REPARACION' | 'INDEMNIZACION' | 'BAJA';
      valor?: number;
      indemnizacion?: number;
    },
  ) {
    return this.novedadesService.resolver(empresaId, id, data, usuarioId);
  }

  @Post(':id/completar-reparacion')
  @Permisos('liberaciones', 'LIBERAR_ACTIVO')
  @ApiOperation({
    summary: 'Inspección humana: cierra la reparación y libera el activo (requiere LIBERAR_ACTIVO)',
  })
  completarReparacion(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.novedadesService.completarReparacion(empresaId, id, usuarioId);
  }
}