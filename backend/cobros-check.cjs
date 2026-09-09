// Verificación en vivo del módulo de Cobros (algoritmo Excel)
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
    console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${cond ? '' : ' :: ' + JSON.stringify(extra).slice(0, 300)}`);
    if (!cond) fails++;
  };

  // 1. Login admin
  const login = await req('POST', '/auth/login', { email: 'admin@estibax.local', password: 'Admin123!' });
  check('Login admin', (login.status === 200 || login.status === 201) && login.data?.access_token, login.data);
  const token = login.data.access_token;

  // 2. Clientes facturables
  const cf = await req('GET', '/economico/clientes-facturables', null, token);
  check('GET /economico/clientes-facturables = 200', cf.status === 200, cf);
  check('5 clientes facturables', Array.isArray(cf.data) && cf.data.length === 5, cf.data?.map?.((c) => c.nombre));
  const abc = (cf.data || []).find((c) => c.nombre === 'Cliente ABC');
  check('Cliente ABC con tarifa 250', !!abc && Number(abc.tarifaDiaria) === 250, abc);

  // 3. Generar cobro del mes actual
  const ahora = new Date();
  const anio = ahora.getUTCFullYear();
  const mes = ahora.getUTCMonth() + 1;
  const gen = await req('POST', '/economico/generar-cobro', { anio, mes }, token);
  check('POST /economico/generar-cobro = 201/200', gen.status === 200 || gen.status === 201, gen);
  check('Respuesta con totales', !!gen.data?.totales && typeof gen.data.totales.cobro === 'number', gen.data);
  check('Detalle por cliente (5)', Array.isArray(gen.data?.detalle) && gen.data.detalle.length === 5, gen.data?.detalle);
  check('Plataformas incluidas', Array.isArray(gen.data?.plataformas) && gen.data.plataformas.length >= 8, gen.data?.plataformas);
  const detAbc = (gen.data?.detalle || []).find((d) => d.cliente === 'Cliente ABC');
  check('Cobro Cliente ABC numérico', !!detAbc && Number.isFinite(detAbc.cobro), detAbc);

  // 4. Liquidaciones del mes
  const liq = await req('GET', `/economico/cobros/${anio}/${mes}`, null, token);
  check(`GET /economico/cobros/${anio}/${mes} = 200`, liq.status === 200, liq);
  check('Liquidaciones persistidas (5)', Array.isArray(liq.data) && liq.data.length === 5, liq.data?.map?.((l) => l.clienteFact?.nombre));
  const primera = (liq.data || [])[0];
  check('Liquidación con detalles diarios', !!primera && Array.isArray(primera.detalles) && primera.detalles.length >= 28, primera && { nDetalles: primera.detalles.length });
  check('Detalle con plataformaNombre y saldoDiario', !!primera && !!primera.detalles[0]?.plataformaNombre && typeof primera.detalles[0]?.saldoDiario === 'number', primera?.detalles?.[0]);

  // 5. Regenerar (upsert, no duplicar)
  const gen2 = await req('POST', '/economico/generar-cobro', { anio, mes }, token);
  const liq2 = await req('GET', `/economico/cobros/${anio}/${mes}`, null, token);
  check('Regeneración idempotente (sigue 5)', Array.isArray(liq2.data) && liq2.data.length === 5, liq2.data?.length);

  console.log(fails === 0 ? '\nTODOS LOS CHECKS PASARON' : `\n${fails} CHECKS FALLARON`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
