import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Portal Cliente')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('mis-activos')
  @Permisos('portal', 'read')
  @ApiOperation({ summary: 'Activos bajo custodia del cliente autenticado' })
  misActivos(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('clienteId') clienteId: string | null,
  ) {
    return this.portalService.misActivos(empresaId, clienteId);
  }

  @Get('mis-movimientos')
  @Permisos('portal', 'read')
  @ApiOperation({ summary: 'Movimientos confirmados del cliente autenticado' })
  misMovimientos(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('clienteId') clienteId: string | null,
  ) {
    return this.portalService.misMovimientos(empresaId, clienteId);
  }

  @Get('balance')
  @Permisos('portal', 'read')
  @ApiOperation({ summary: 'Balance de devolución del cliente autenticado' })
  balance(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('clienteId') clienteId: string | null,
  ) {
    return this.portalService.miBalance(empresaId, clienteId);
  }
}