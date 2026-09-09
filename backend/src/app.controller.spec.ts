import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            activo: { count: jest.fn().mockResolvedValue(10) },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return status ok and a timestamp', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('db health', () => {
    it('should return status ok, activos count and timestamp', async () => {
      const result = await appController.getDbHealth();
      expect(result.status).toBe('ok');
      expect(result.activos).toBe(10);
      expect(result.timestamp).toBeDefined();
    });
  });
});

