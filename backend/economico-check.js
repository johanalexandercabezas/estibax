const fetch = require('node-fetch');
const BASE = 'http://localhost:3000';

(async () => {
  // Auto-login si no hay TOKEN en el entorno
  let TOKEN = process.env.TOKEN;
  if (!TOKEN) {
    const l = await fetch(BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@estibax.local', password: 'Admin123!' }),
    });
    TOKEN = (await l.json()).access_token;
  }
  const headers = { Authorization: `Bearer ${TOKEN}` };

  let pass = 0, fail = 0;
  function ok(msg) { console.log('PASS:', msg); pass++; }
  function bad(msg) { console.log('FAIL:', msg); fail++; }
  async function call(path, opts = {}) {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json', ...headers },
      ...opts,
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }

  // 1. Listar contratos
  let r = await call('/economico/contratos');
  if (r.res.ok && Array.isArray(r.body) && r.body.length > 0) {
    ok('GET /economico/contratos');
  } else { bad('GET /economico/contratos'); }

  // 2. Tarifas del contrato
  const contratoId = r.body[0]?.id;
  r = await call(`/economico/contratos/${contratoId}/tarifas`);
  if (r.res.ok && Array.isArray(r.body) && r.body.length > 0) {
    ok('GET /economico/contratos/:id/tarifas');
  } else { bad('GET /economico/contratos/:id/tarifas'); }

  // 3. Generar cobro diario
  r = await call(`/economico/contratos/${contratoId}/cobro-diario`, { method: 'POST', body: '{}' });
  if (r.res.ok && r.body.cobro) {
    ok(`POST /economico/contratos/:id/cobro-diario (${r.body.desglose?.length ?? 0} tipos, $${r.body.cobro.valorTotal ?? 0})`);
  } else { bad('POST /economico/contratos/:id/cobro-diario'); }

  // 4. Liquidación mensual
  const fecha = new Date();
  r = await call('/economico/liquidaciones', {
    method: 'POST',
    body: JSON.stringify({
      clienteId: r.body?.cobro?.clienteId ?? (await call('/clientes')).body[0].id,
      anio: fecha.getUTCFullYear(),
      mes: fecha.getUTCMonth() + 1,
    }),
  });
  if (r.res.ok && r.body?.liquidacion) {
    ok(`POST /economico/liquidaciones (total $${r.body.total})`);
  } else { bad('POST /economico/liquidaciones'); }

  // 5. Listar liquidaciones
  r = await call('/economico/liquidaciones');
  if (r.res.ok && Array.isArray(r.body)) {
    ok('GET /economico/liquidaciones');
  } else { bad('GET /economico/liquidaciones'); }

  console.log(`\nRESULTADO: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
