import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getDbHealth(): Promise<{
    status: string;
    activos: number;
    timestamp: string;
  }> {
    const activos = await this.prisma.activo.count();
    return {
      status: 'ok',
      activos,
      timestamp: new Date().toISOString(),
    };
  }
}

