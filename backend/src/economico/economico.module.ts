import { Module } from '@nestjs/common';
import { EconomicoService } from './economico.service';
import { EconomicoController } from './economico.controller';

@Module({
  controllers: [EconomicoController],
  providers: [EconomicoService],
  exports: [EconomicoService],
})
export class EconomicoModule {}