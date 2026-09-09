import { Module } from '@nestjs/common';
import { ActivosService } from './activos.service';
import { ActivosController } from './activos.controller';

@Module({
  controllers: [ActivosController],
  providers: [ActivosService],
  exports: [ActivosService],
})
export class ActivosModule {}