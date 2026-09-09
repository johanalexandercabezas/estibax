import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ActivosService } from './activos.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Unit tests de ActivosService — reglas de negocio puras con Prisma mockeado.
 * No requieren base de datos.
 */
describe('ActivosService (unit)', () => {
  let service: ActivosService;
  let prisma: { activo: Record<string, jest.Mock>; tipoActivo: Record<string, jest.Mock> };

  const EMPRESA = 'empresa-1';

  const makeActivo = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'a1',
    codigo: 'EST-00001',
    empresaId: EMPRESA,
    estadoFisico: 'BUENO',
    estadoLogistico: 'DISPONIBLE',
    estadoOperativo: 'LIBRE',
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      activo: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      tipoActivo: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ActivosService>(ActivosService);
  });

  describe('validarDisponible', () => {
    it('acepta un activo BUENO / DISPONIBLE / LIBRE', async () => {
      prisma.activo.findFirst.mockResolvedValue(makeActivo());
      await expect(service.validarDisponible(EMPRESA, 'a1')).resolves.toBeDefined();
    });

    it('rechaza un activo BLOQUEADO (regla 7.6)', async () => {
      prisma.activo.findFirst.mockResolvedValue(
        makeActivo({ estadoOperativo: 'BLOQUEADO' }),
      );
      await expect(service.validarDisponible(EMPRESA, 'a1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza un activo no DISPONIBLE (en cliente)', async () => {
      prisma.activo.findFirst.mockResolvedValue(
        makeActivo({ estadoLogistico: 'EN_CLIENTE' }),
      );
      await expect(service.validarDisponible(EMPRESA, 'a1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza un activo con daño CRITICO', async () => {
      prisma.activo.findFirst.mockResolvedValue(
        makeActivo({ estadoFisico: 'CRITICO' }),
      );
      await expect(service.validarDisponible(EMPRESA, 'a1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('devuelve 404 si el activo no existe o es de otra empresa', async () => {
      prisma.activo.findFirst.mockResolvedValue(null);
      await expect(service.validarDisponible(EMPRESA, 'a1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bloquear / desbloquear', () => {
    it('bloquea un activo LIBRE', async () => {
      prisma.activo.findFirst
        .mockResolvedValueOnce(makeActivo())
        .mockResolvedValue(makeActivo({ estadoOperativo: 'BLOQUEADO' }));
      prisma.activo.updateMany.mockResolvedValue({ count: 1 });
      const res = await service.bloquear(EMPRESA, 'a1', 'user-1');
      expect(res.estadoOperativo).toBe('BLOQUEADO');
      expect(prisma.activo.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1', empresaId: EMPRESA },
          data: { estadoOperativo: 'BLOQUEADO' },
        }),
      );
    });

    it('desbloquea un activo BLOQUEADO', async () => {
      prisma.activo.findFirst
        .mockResolvedValueOnce(makeActivo({ estadoOperativo: 'BLOQUEADO' }))
        .mockResolvedValue(makeActivo({ estadoOperativo: 'LIBRE' }));
      prisma.activo.updateMany.mockResolvedValue({ count: 1 });
      const res = await service.desbloquear(EMPRESA, 'a1', 'user-1');
      expect(res.estadoOperativo).toBe('LIBRE');
      expect(prisma.activo.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a1', empresaId: EMPRESA },
          data: { estadoOperativo: 'LIBRE' },
        }),
      );
    });

    it('rechaza bloquear un activo ya bloqueado', async () => {
      prisma.activo.findFirst.mockResolvedValue(
        makeActivo({ estadoOperativo: 'BLOQUEADO' }),
      );
      await expect(service.bloquear(EMPRESA, 'a1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza desbloquear un activo que no está bloqueado', async () => {
      prisma.activo.findFirst.mockResolvedValue(makeActivo());
      await expect(service.desbloquear(EMPRESA, 'a1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('ficha 360° (findById)', () => {
    it('incluye historial (lineas, novedades, kardexEntries) y jerarquía de ubicación', async () => {
      prisma.activo.findFirst.mockResolvedValue(
        makeActivo({
          lineas: [],
          novedades: [],
          kardexEntries: [],
          ubicacion: {
            nombre: 'Zona B',
            bodega: { nombre: 'Bodega Principal', planta: { nombre: 'Planta Central', sede: { nombre: 'Sede Medellín' } } },
          },
        }),
      );
      const res = await service.findById(EMPRESA, 'a1');
      expect(Array.isArray(res.lineas)).toBe(true);
      expect(Array.isArray(res.novedades)).toBe(true);
      expect(Array.isArray(res.kardexEntries)).toBe(true);
      expect(res.ubicacion.bodega.planta.sede.nombre).toBe('Sede Medellín');
    });

    it('lanza 404 si no existe', async () => {
      prisma.activo.findFirst.mockResolvedValue(null);
      await expect(service.findById(EMPRESA, 'no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('filtros de listado (findAll)', () => {
    it('aplica los filtros de los 3 ejes de estado', async () => {
      prisma.activo.findMany.mockResolvedValue([]);
      await service.findAll(EMPRESA, {
        estadoFisico: 'BUENO',
        estadoLogistico: 'DISPONIBLE',
        estadoOperativo: 'LIBRE',
        propiedad: 'PROPIA',
      });
      expect(prisma.activo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId: EMPRESA,
            estadoFisico: 'BUENO',
            estadoLogistico: 'DISPONIBLE',
            estadoOperativo: 'LIBRE',
            propiedad: 'PROPIA',
          }),
        }),
      );
    });
  });
});
