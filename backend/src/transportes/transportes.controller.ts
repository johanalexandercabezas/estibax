import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transportes')
export class TransportesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('vehiculos')
  @Permisos('transportes', 'read')
  @ApiOperation({ summary: 'Listar vehículos de la empresa' })
  listarVehiculos(@CurrentUser('empresaId') empresaId: string) {
    return this.prisma.vehiculo.findMany({
      where: { empresaId },
      orderBy: { placa: 'asc' },
    });
  }

  @Get('transportistas')
  @Permisos('transportes', 'read')
  @ApiOperation({ summary: 'Listar transportistas de la empresa' })
  listarTransportistas(@CurrentUser('empresaId') empresaId: string) {
    return this.prisma.transportista.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
  }
}
