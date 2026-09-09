import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      // En desarrollo permitimos que la API arranque sin base de datos.
      // Los endpoints que consultan datos devolveran error hasta que haya DB.
      this.logger.warn(
        'No se pudo conectar a la base de datos. Verifica DATABASE_URL. ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

