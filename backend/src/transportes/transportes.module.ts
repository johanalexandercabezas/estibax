import { Module } from '@nestjs/common';
import { TransportesController } from './transportes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransportesController],
})
export class TransportesModule {}
