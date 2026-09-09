import { Module } from '@nestjs/common';
import { NovedadesService } from './novedades.service';
import { NovedadesController } from './novedades.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [AuditoriaModule],
  controllers: [NovedadesController],
  providers: [NovedadesService],
  exports: [NovedadesService],
})
export class NovedadesModule {}