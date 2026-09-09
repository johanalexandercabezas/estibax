import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * E2E: Ficha 360° del activo — valida que GET /activos/:id retorna lineas, novedades, kardexEntries
 * y la ubicación jerárquica (sede → planta → bodega → zona).
 *
 * Datos base del seed:
 *   - Activo: EST-00009 (tipo: Estiba plástica, propiedad: ERCOL, ubicación: Sede Medellín → Planta Central → Bodega Principal → Zona B)
 */
describe('FichaActivoE2E (GET /activos/:id con historial completo)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@estibax.local', password: 'Admin123!' });
    jwtToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Ficha 360°', () => {
    it('GET /activos/:id debería retornar tipo, propiedad, estados y jerarquía de ubicación', async () => {
      // Buscar un activo del seed para usar su ID
      const activos = await request(app.getHttpServer())
        .get('/activos')
        .set('Authorization', `Bearer ${jwtToken}`);
      const listaAct = Array.isArray(activos.body) ? activos.body : activos.body?.data ?? [];
      // Preferir un activo EST- (estiba) para validar el prefijo; si no hay, usar el primero
      const estActivo = listaAct.find((a: any) => typeof a.codigo === 'string' && a.codigo.startsWith('EST-'));
      const activoId = (estActivo ?? listaAct[0]).id;

      const res = await request(app.getHttpServer())
        .get(`/activos/${activoId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.codigo).toMatch(/^EST-/);
      expect(res.body.tipoActivo.nombre).toBeDefined();
      expect(['PROPIA', 'ERCOL', 'TERCERO']).toContain(res.body.propiedad);
      expect(['BUENO', 'REGULAR', 'DANADO', 'CRITICO']).toContain(res.body.estadoFisico);
      expect(['DISPONIBLE', 'EN_TRANSITO', 'EN_CLIENTE', 'EN_REPARACION', 'PERDIDA', 'BAJA']).toContain(res.body.estadoLogistico);
      expect(['LIBRE', 'BLOQUEADO']).toContain(res.body.estadoOperativo);

      // Jerarquía de ubicación completa
      expect(res.body.ubicacion).toBeDefined();
      const ubi = res.body.ubicacion;
      expect(ubi.nombre).toBeDefined(); // Zona
      expect(ubi.bodega?.nombre).toBeDefined();
      expect(ubi.bodega?.planta?.nombre).toBeDefined();
      expect(ubi.bodega?.planta?.sede?.nombre).toBeDefined();
    });

    it('debería incluir historial (lineas, novedades, kardexEntries) aunque estén vacíos', async () => {
      const activos = await request(app.getHttpServer())
        .get('/activos')
        .set('Authorization', `Bearer ${jwtToken}`);
      const listaAct = Array.isArray(activos.body) ? activos.body : activos.body?.data ?? [];
      const activoId = listaAct[0].id;

      const res = await request(app.getHttpServer())
        .get(`/activos/${activoId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      // Arrays siempre deben estar definidos (para el frontend)
      expect(Array.isArray(res.body.lineas)).toBe(true);
      expect(Array.isArray(res.body.novedades)).toBe(true);
      expect(Array.isArray(res.body.kardexEntries)).toBe(true);
    });

    it('GET /activos/:id con ID inexistente debería devolver 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/activos/id-que-no-existe-12345')
        .set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(404);
    });
  });
});
