// Verificación en vivo del CRUD de clientes facturables (Configuración)
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = 'http://127.0.0.1:3000';

async function req(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  let fails = 0;
  const check = (name, cond, extra) => {
    const extraStr = extra === undefined ? '' : String(JSON.stringify(extra)).slice(0, 300);
    console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${cond ? '' : ' :: ' + extraStr}`);
    if (!cond) fails++;
  };

  const login = await req('POST', '/auth/login', { email: 'admin@estibax.local', password: 'Admin123!' });
  check('Login admin', login.status === 200 || login.status === 201, login.data);
  const token = login.data.access_token;

  // 1. GET /configuracion/empresa incluye clientesFacturables (5 del seed)
  const cfg = await req('GET', '/configuracion/empresa', null, token);
  check('GET /configuracion/empresa = 200', cfg.status === 200, cfg);
  check('clientesFacturables = 5', Array.isArray(cfg.data?.clientesFacturables) && cfg.data.clientesFacturables.length === 5, cfg.data?.clientesFacturables?.length);

  // 2. Crear
  const crear = await req('POST', '/configuracion/clientes-facturables', { nombre: 'Cliente Prueba CRUD', tarifaDiaria: 123 }, token);
  check('POST crear = 201', crear.status === 201 && crear.data?.id, crear.data);
  const nuevoId = crear.data?.id;

  // 3. Duplicado debe rechazarse
  const duplicado = await req('POST', '/configuracion/clientes-facturables', { nombre: 'Cliente Prueba CRUD', tarifaDiaria: 1 }, token);
  check('POST duplicado = 400', duplicado.status === 400, duplicado.data);

  // 4. Listar ahora 6
  const lista = await req('GET', '/economico/clientes-facturables', null, token);
  check('GET clientes-facturables = 6', Array.isArray(lista.data) && lista.data.length === 6, lista.data?.length);

  // 5. Editar tarifa + desactivar
  const editar = await req('PUT', `/configuracion/clientes-facturables/${nuevoId}`, { tarifaDiaria: 999, activo: false }, token);
  check('PUT editar = 200', editar.status === 200 && Number(editar.data?.tarifaDiaria) === 999 && editar.data?.activo === false, editar.data);

  // 6. Tarifa negativa rechazada
  const negativa = await req('PUT', `/configuracion/clientes-facturables/${nuevoId}`, { tarifaDiaria: -5 }, token);
  check('PUT tarifa negativa = 400', negativa.status === 400, negativa.data);

  console.log(fails === 0 ? '\nTODOS LOS CHECKS PASARON' : `\n${fails} CHECKS FALLARON`);

  // 7. Limpieza: eliminar el cliente de prueba (no contamina el seed)
  await prisma.clienteFacturable.deleteMany({ where: { nombre: 'Cliente Prueba CRUD' } });
  const restante = await prisma.clienteFacturable.count();
  console.log(`Limpieza OK, clientes facturables restantes: ${restante}`);
  await prisma.$disconnect();
  process.exit(fails === 0 ? 0 : 1);
})().catch(async (e) => { console.error('ERROR:', e.message); await prisma.$disconnect(); process.exit(1); });