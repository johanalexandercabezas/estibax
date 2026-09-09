import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permisos } from '../common/decorators/permisos.decorator';
import { AsistenteService } from './asistente.service';

@ApiTags('Asistente')
@ApiBearerAuth()
@Controller('asistente')
export class AsistenteController {
  constructor(private readonly service: AsistenteService) {}

  @Get('contexto')
  @Permisos('kardex', 'read')
  contexto(@CurrentUser('empresaId') empresaId: string) {
    return this.service.contexto(empresaId);
  }

  @Post('acciones')
  @Permisos('configuracion', 'write')
  ejecutar(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Body() input: { tipo: 'CREAR_CLIENTE' | 'CREAR_PLATAFORMA'; nombre: string; email?: string; documento?: string },
  ) {
    return this.service.ejecutar(empresaId, usuarioId, input);
  }
}
