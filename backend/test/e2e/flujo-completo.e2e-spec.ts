import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('FlujoCompletoE2E (Login → Movimiento → Confirmar → Revertir)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;
  let activoTest: string;
  let clienteTest: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Login como admin del seed
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@estibax.local', password: 'Admin123!' });
    jwtToken = loginRes.body.access_token;
    expect(jwtToken).toBeDefined();

    // Obtener un activo disponible del seed para usar en el test
    const activos = await request(app.getHttpServer())
      .get('/activos?estadoLogistico=DISPONIBLE')
      .set('Authorization', `Bearer ${jwtToken}`);
    activoTest = activos.body[0]?.id;
    expect(activoTest).toBeDefined();

    // Cliente ABC del seed
    const clientes = await request(app.getHttpServer())
      .get('/clientes')
      .set('Authorization', `Bearer ${jwtToken}`);
    clienteTest = clientes.body.find((c: any) => c.nombre === 'Cliente ABC').id;
    expect(clienteTest).toBeDefined();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('debería crear movimiento BORRADOR, confirmar con firma, generar secuencia y revertir', async () => {
    // 1. Crear movimiento BORRADOR (SALIDA con firma)
    const createRes = await request(app.getHttpServer())
      .post('/movimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        tipo: 'SALIDA',
        clienteId: clienteTest,
        lineas: [{ activoId: activoTest, cantidad: 1 }],
      });
    expect(createRes.status).toBe(201);
    const movBorradorId = createRes.body.id;
    expect(createRes.body.estado).toBe('BORRADOR');

    // 2a. Confirmar sin firma debe ser rechazado (regla 7.5)
    const sinFirma = await request(app.getHttpServer())
      .post(`/movimientos/${movBorradorId}/confirmar`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({});
    expect(sinFirma.status).toBe(400);

    // 2b. Confirmar CON firma electrónica → genera secuencia SAL-NNNNNN
    const confirmRes = await request(app.getHttpServer())
      .post(`/movimientos/${movBorradorId}/confirmar`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        firma: { nombre: 'Juan Pérez', documento: '12345678', cargo: 'Jefe de Bodega' },
      });
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.documento).toMatch(/^SAL-\d{6}$/);
    expect(confirmRes.body.estado).toBe('CONFIRMADO');
    const numeroUsado = Number(confirmRes.body.documento.split('-')[1]);

    // 3. Verificar kardex entry con hash SHA-256 (regla 3.3) y firma persistida
    const detalle = await request(app.getHttpServer())
      .get(`/movimientos/${movBorradorId}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(detalle.status).toBe(200);
    const entry = detalle.body.kardexEntries?.[0];
    expect(entry).toBeDefined();
    expect(entry.hashIntegridad).toMatch(/^[a-f0-9]{64}$/); // SHA-256
    expect(detalle.body.firmaNombre).toBe('Juan Pérez');

    // 4. Revertir movimiento (auditoría registrada)
    const revertRes = await request(app.getHttpServer())
      .post(`/movimientos/${movBorradorId}/revertir`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ motivo: 'Corrección de prueba E2E' });
    expect(revertRes.status).toBe(201);
    expect(revertRes.body.tipo).toBe('REVERSION');
    expect(revertRes.body.correccionDeId).toBe(movBorradorId);

    // 5. Verificar que el original quedó REVERTIDO (inmutabilidad)
    const original = await request(app.getHttpServer())
      .get(`/movimientos/${movBorradorId}`)
      .set('Authorization', `Bearer ${jwtToken}`);
    expect(original.body.estado).toBe('REVERTIDO');

    // 6. Verificar auditoría de confirmación y reversión
    const auditoria = await request(app.getHttpServer())
      .get('/auditoria')
      .set('Authorization', `Bearer ${jwtToken}`);
    const registros = Array.isArray(auditoria.body) ? auditoria.body : auditoria.body?.data ?? [];
    const acciones = registros.map((a: any) => a.accion);
    expect(acciones).toContain('CONFIRMAR');
    expect(acciones).toContain('REVERTIR');

    // 7. Verificar que el número de secuencia no se reutiliza (regla 7.4):
    //    otro SALIDA confirmado usa un número estrictamente mayor.
    const activos2 = await request(app.getHttpServer())
      .get('/activos?estadoLogistico=DISPONIBLE')
      .set('Authorization', `Bearer ${jwtToken}`);
    const lista2 = Array.isArray(activos2.body) ? activos2.body : activos2.body?.data ?? [];
    const otroActivo = lista2.find((a: any) => a.id !== activoTest);
    if (otroActivo) {
      const borrador2 = await request(app.getHttpServer())
        .post('/movimientos')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          tipo: 'SALIDA',
          clienteId: clienteTest,
          lineas: [{ activoId: otroActivo.id, cantidad: 1 }],
        });
      expect(borrador2.status).toBe(201);
      const confirm2 = await request(app.getHttpServer())
        .post(`/movimientos/${borrador2.body.id}/confirmar`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          firma: { nombre: 'Ana Gómez', documento: '87654321', cargo: 'Operaria' },
        });
      expect(confirm2.status).toBe(201);
      const numero2 = Number(confirm2.body.documento.split('-')[1]);
      expect(numero2).toBeGreaterThan(numeroUsado);

      // limpieza: revertir el segundo para dejar el activo disponible
      await request(app.getHttpServer())
        .post(`/movimientos/${borrador2.body.id}/revertir`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ motivo: 'Limpieza de prueba E2E' });
    }
  }, 60000);
});
