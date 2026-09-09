import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health/db')
  async getDbHealth(): Promise<{ status: string; activos: number; timestamp: string }> {
    return this.appService.getDbHealth();
  }
}

