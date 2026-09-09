// Verificación en vivo del despacho: vehículo/transportista en movimientos
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
    const extraStr = extra === undefined ? '' : String(JSON.stringify(extra)).slice(0, 250);
    console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${cond ? '' : ' :: ' + extraStr}`);
    if (!cond) fails++;
  };

  const login = await req('POST', '/auth/login', { email: 'admin@estibax.local', password: 'Admin123!' });
  check('Login admin', (login.status === 200 || login.status === 201) && login.data?.access_token, login.data);
  const token = login.data.access_token;

  // 1. Catálogos de transporte
  const veh = await req('GET', '/transportes/vehiculos', null, token);
  const tra = await req('GET', '/transportes/transportistas', null, token);
  check('GET vehiculos = 200 y hay datos', veh.status === 200 && Array.isArray(veh.data) && veh.data.length > 0, veh.data);
  check('GET transportistas = 200 y hay datos', tra.status === 200 && Array.isArray(tra.data) && tra.data.length > 0, tra.data);
  const vehiculo = veh.data?.[0];
  const transportista = tra.data?.[0];

  // 2. Activo disponible + Cliente ABC
  const activos = await req('GET', '/activos?estadoLogistico=DISPONIBLE', null, token);
  const activo = (Array.isArray(activos.data) ? activos.data : activos.data?.data ?? [])[0];
  check('Hay activo DISPONIBLE', !!activo?.id, activos.data);
  const clientes = await req('GET', '/clientes', null, token);
  const abc = (clientes.data || []).find((c) => c.nombre === 'Cliente ABC');
  check('Cliente ABC existe', !!abc?.id, clientes.data?.map?.((c) => c.nombre));

  // 3. Crear borrador SALIDA con despacho
  const crear = await req('POST', '/movimientos', {
    tipo: 'SALIDA',
    clienteId: abc.id,
    vehiculoId: vehiculo.id,
    transportistaId: transportista.id,
    lineas: [{ activoId: activo.id, cantidad: 1 }],
  }, token);
  check('POST /movimientos = 201', crear.status === 201, crear.data);
  const movId = crear.data?.id;
  check('Borrador persiste vehiculo.placa', crear.data?.vehiculo?.placa === vehiculo.placa, crear.data?.vehiculo);
  check('Borrador persiste transportista.nombre', crear.data?.transportista?.nombre === transportista.nombre, crear.data?.transportista);

  // 4. GET /movimientos incluye despacho
  const lista = await req('GET', '/movimientos', null, token);
  const mov = (lista.data || []).find((m) => m.id === movId);
  check('Listado trae vehiculo.placa', mov?.vehiculo?.placa === vehiculo.placa, mov?.vehiculo);
  check('Listado trae transportista.nombre', mov?.transportista?.nombre === transportista.nombre, mov?.transportista);

  console.log(fails === 0 ? '\nTODOS LOS CHECKS PASARON' : `\n${fails} CHECKS FALLARON`);

  // 5. Limpieza: eliminar el borrador de prueba (no afecta estados de activos)
  if (movId) {
    await prisma.movimientoLinea.deleteMany({ where: { movimientoId: movId } });
    await prisma.movimiento.delete({ where: { id: movId } });
    console.log('Limpieza OK: borrador de prueba eliminado');
  }
  await prisma.$disconnect();
  process.exit(fails === 0 ? 0 : 1);
})().catch(async (e) => { console.error('ERROR:', e.message); await prisma.$disconnect(); process.exit(1); });