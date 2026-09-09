import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EconomicoService } from './economico.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permisos } from '../common/decorators/permisos.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Economico')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('economico')
export class EconomicoController {
  constructor(private readonly economicoService: EconomicoService) {}

  @Get('contratos')
  @Permisos('economico', 'read')
  @ApiOperation({ summary: 'Listar contratos con sus tarifas históricas' })
  listarContratos(@CurrentUser('empresaId') empresaId: string) {
    return this.economicoService.listarContratos(empresaId);
  }

  @Get('contratos/:id/tarifas')
  @Permisos('economico', 'read')
  @ApiOperation({ summary: 'Tarifas históricas de un contrato' })
  listarTarifas(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.economicoService.listarTarifas(empresaId, id);
  }

  @Post('contratos/:id/cobro-diario')
  @Permisos('economico', 'write')
  @ApiOperation({ summary: 'Generar cobro del día para un contrato' })
  cobroDiario(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() data: { fecha?: string },
  ) {
    const fecha = data?.fecha ? new Date(data.fecha) : new Date();
    return this.economicoService.generarCobroDiario(empresaId, id, fecha);
  }

  @Post('liquidaciones')
  @Permisos('economico', 'write')
  @ApiOperation({ summary: 'Liquidación mensual de un cliente' })
  liquidar(
    @CurrentUser('empresaId') empresaId: string,
    @Body() data: { clienteId: string; anio: number; mes: number },
  ) {
    if (!data?.clienteId || !data?.anio || !data?.mes) {
      throw new BadRequestException('Debe indicar clienteId, anio y mes');
    }
    return this.economicoService.liquidarMensual(
      empresaId,
      data.clienteId,
      Number(data.anio),
      Number(data.mes),
    );
  }

     @Get('liquidaciones')
  @Permisos('economico', 'read')
  @ApiOperation({ summary: 'Listar liquidaciones mensuales' })
  listarLiquidaciones(@CurrentUser('empresaId') empresaId: string, @Query() filters: any) {
    return this.economicoService.listarLiquidaciones(empresaId, filters);
  }

  // === Cobros con algoritmo Excel (saldo diario × tarifa) ===

  @Get('clientes-facturables')
  @Permisos('economico', 'read')
  @ApiOperation({ summary: 'Listar clientes facturables con tarifas' })
  listarClientesFacturables(@CurrentUser('empresaId') empresaId: string) {
    return this.economicoService.listarClientesFacturables(empresaId);
  }

  @Post('generar-cobro')
  @Permisos('economico', 'write')
  @ApiOperation({ summary: 'Generar/actualizar cobro mensual con algoritmo Excel' })
  generarCobro(
    @CurrentUser('empresaId') empresaId: string,
    @Body() data: { anio: number; mes: number; plataformas?: string[] },
  ) {
    if (!data?.anio || !data?.mes) {
      throw new BadRequestException('Debe indicar anio y mes');
    }
    return this.economicoService.generarCobroExcel(
      empresaId,
      Number(data.anio),
      Number(data.mes),
      data.plataformas,
    );
  }

  @Get('cobros/:anio/:mes')
  @Permisos('economico', 'read')
  @ApiOperation({ summary: 'Obtener liquidaciones de un mes específico' })
  getLiquidacionesMes(
    @CurrentUser('empresaId') empresaId: string,
    @Param('anio') anio: string,
    @Param('mes') mes: string,
  ) {
    return this.economicoService.getLiquidacionesMes(
      empresaId,
      Number(anio),
      Number(mes),
    );
  }

  @Get('historial')
  @Permisos('economico', 'read')
  @ApiOperation({ summary: 'Historial de periodos liquidados (resumen por año/mes)' })
  historial(@CurrentUser('empresaId') empresaId: string) {
    return this.economicoService.historial(empresaId);
  }

  @Get('cierre-ingreso/:anio/:mes')
  @Permisos('economico', 'read')
  obtenerCierreIngreso(
    @CurrentUser('empresaId') empresaId: string,
    @Param('anio') anio: string,
    @Param('mes') mes: string,
  ) {
    return this.economicoService.obtenerCierreIngreso(empresaId, Number(anio), Number(mes));
  }

  @Put('cierre-ingreso/:anio/:mes')
  @Permisos('economico', 'write')
  configurarCierreIngreso(
    @CurrentUser('empresaId') empresaId: string,
    @Param('anio') anio: string,
    @Param('mes') mes: string,
    @Body() data: { diaLimite: number },
  ) {
    return this.economicoService.configurarCierreIngreso(empresaId, Number(anio), Number(mes), Number(data?.diaLimite));
  }

  @Post('cierre-ingreso/:anio/:mes/cerrar')
  @Permisos('economico', 'write')
  cerrarIngreso(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('id') usuarioId: string,
    @Param('anio') anio: string,
    @Param('mes') mes: string,
  ) {
    return this.economicoService.cerrarIngreso(empresaId, Number(anio), Number(mes), usuarioId);
  }

  @Post('cobros/:anio/:mes/cerrar')
  @Permisos('economico', 'write')
  @ApiOperation({ summary: 'Cerrar el mes de cobros (protege las liquidaciones contra regeneración)' })
  cerrarMes(
    @CurrentUser('empresaId') empresaId: string,
    @Param('anio') anio: string,
    @Param('mes') mes: string,
  ) {
    return this.economicoService.cerrarMes(empresaId, Number(anio), Number(mes));
  }
}