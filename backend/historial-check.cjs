// Verificación en vivo del historial de periodos de cobros
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = 'http://127.0.0.1:3000';
const ANIO = 2024;
const MES = 4;

async function req(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  check('Login admin', (login.status === 200 || login.status === 201) && login.data?.access_token);
  const token = login.data.access_token;

  // 1. Historial inicial
  const hist1 = await req('GET', '/economico/historial', null, token);
  check('GET /economico/historial = 200', hist1.status === 200 && Array.isArray(hist1.data), hist1.data);

  // 2. Generar cobro del periodo de prueba y verificar que aparece en historial
  const gen = await req('POST', '/economico/generar-cobro', { anio: ANIO, mes: MES }, token);
  check('generar-cobro 2024/04 = 201/200', gen.status === 201 || gen.status === 200, gen.data);
  const hist2 = await req('GET', '/economico/historial', null, token);
  const p2 = (hist2.data || []).find((x) => x.anio === ANIO && x.mes === MES);
  check('Periodo 2024/04 en historial', !!p2, hist2.data);
  check('Periodo con 5 clientes', p2?.clientes === 5, p2);
  check('Periodo con totalEstibasDia numérico', typeof p2?.totalEstibasDia === 'number', p2);
  check('Periodo con totalCobro numérico', typeof p2?.totalCobro === 'number', p2);
  check('Periodo inicial ABERTA (cerradas=0)', p2?.cerradas === 0 && p2?.abiertas === 5, p2);

  // 3. Cerrar el mes → historial debe reportar todo cerrado
  const cerrar = await req('POST', `/economico/cobros/${ANIO}/${MES}/cerrar`, null, token);
  check('cerrar 2024/04', cerrar.status === 201 || cerrar.status === 200, cerrar.data);
  const hist3 = await req('GET', '/economico/historial', null, token);
  const p3 = (hist3.data || []).find((x) => x.anio === ANIO && x.mes === MES);
  check('Periodo CERRADO (cerradas=5, abiertas=0)', p3?.cerradas === 5 && p3?.abiertas === 0, p3);

  // 4. Orden descendente
  const ordenado = (hist3.data || []).every((x, i, arr) => i === 0 || arr[i - 1].anio > x.anio || (arr[i - 1].anio === x.anio && arr[i - 1].mes >= x.mes));
  check('Historial ordenado desc por año/mes', ordenado, hist3.data?.map((x) => `${x.anio}-${x.mes}`));

  console.log(fails === 0 ? '\nTODOS LOS CHECKS PASARON' : `\n${fails} CHECKS FALLARON`);

  // 5. Limpieza del periodo de prueba
  await prisma.liquidacionDetalle.deleteMany({ where: { liquidacion: { anio: ANIO, mes: MES } } });
  await prisma.liquidacionCF.deleteMany({ where: { anio: ANIO, mes: MES } });
  console.log('Limpieza OK: periodo de prueba eliminado');
  await prisma.$disconnect();
  process.exit(fails === 0 ? 0 : 1);
})().catch(async (e) => { console.error('ERROR:', e.message); await prisma.$disconnect(); process.exit(1); });