import { Module } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { MovimientosController } from './movimientos.controller';
import { ClientesModule } from '../clientes/clientes.module';
import { ActivosModule } from '../activos/activos.module';

@Module({
  imports: [ClientesModule, ActivosModule],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}