// Verificación en vivo del cierre de mes de cobros (protección contra regeneración)
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = 'http://127.0.0.1:3000';
const ANIO = 2022; // periodo de prueba sin datos
const MES = 6;

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

  // 1. Generar cobro (periodo de prueba) antes de cerrar
  const genAntes = await req('POST', '/economico/generar-cobro', { anio: ANIO, mes: MES }, token);
  check('generar-cobro antes = 201/200', genAntes.status === 201 || genAntes.status === 200, genAntes.data);
  const totalAntes = genAntes.data?.totales?.cobro;
  check('Total numérico antes', typeof totalAntes === 'number', genAntes.data?.totales);

  // 2. Cerrar el mes
  const cerrado = await req('POST', `/economico/cobros/${ANIO}/${MES}/cerrar`, null, token);
  check('POST cerrar = 201/200', cerrado.status === 201 || cerrado.status === 200, cerrado.data);
  check('Cerradas = 5', cerrado.data?.cerradas === 5, cerrado.data);

  // 3. Estado CERRADA en las liquidaciones
  const liq = await req('GET', `/economico/cobros/${ANIO}/${MES}`, null, token);
  check('Todas CERRADA', Array.isArray(liq.data) && liq.data.length === 5 && liq.data.every((l) => l.estado === 'CERRADA'), liq.data?.map((l) => l.estado));

  // 4. Regenerar: las CERRADAS se conservan (no se sobreescriben)
  const genDespues = await req('POST', '/economico/generar-cobro', { anio: ANIO, mes: MES }, token);
  check('generar-cobro después = 201/200', genDespues.status === 201 || genDespues.status === 200, genDespues.data);
  check('cerradas reportadas = 5', genDespues.data?.cerradas === 5, genDespues.data);
  check('Total se conserva tras cerrar', genDespues.data?.totales?.cobro === totalAntes, { antes: totalAntes, despues: genDespues.data?.totales?.cobro });
  check('Detalle marca cerrada=true', (genDespues.data?.detalle || []).every((d) => d.cerrada === true), genDespues.data?.detalle?.map((d) => d.cerrada));
  const liq2 = await req('GET', `/economico/cobros/${ANIO}/${MES}`, null, token);
  check('Siguen 5 liquidaciones CERRADA', liq2.data?.length === 5 && liq2.data.every((l) => l.estado === 'CERRADA'), liq2.data?.length);

  // 5. ABRIR de nuevo: al borrar el estado CERRADA, la regeneración vuelve a activarse
  await prisma.liquidacionCF.updateMany({ where: { anio: ANIO, mes: MES }, data: { estado: 'GENERADA' } });
  const genReabierta = await req('POST', '/economico/generar-cobro', { anio: ANIO, mes: MES }, token);
  check('Al reabrir, cerradas = 0', genReabierta.data?.cerradas === 0, genReabierta.data);
  check('Detalle ya NO está cerrado', (genReabierta.data?.detalle || []).every((d) => !d.cerrada), genReabierta.data?.detalle?.map((d) => d.cerrada));

  console.log(fails === 0 ? '\nTODOS LOS CHECKS PASARON' : `\n${fails} CHECKS FALLARON`);

  // 6. Limpieza completa del periodo de prueba
  await prisma.liquidacionDetalle.deleteMany({ where: { liquidacion: { anio: ANIO, mes: MES } } });
  await prisma.liquidacionCF.deleteMany({ where: { anio: ANIO, mes: MES } });
  console.log('Limpieza OK: periodo de prueba eliminado');
  await prisma.$disconnect();
  process.exit(fails === 0 ? 0 : 1);
})().catch(async (e) => { console.error('ERROR:', e.message); await prisma.$disconnect(); process.exit(1); });