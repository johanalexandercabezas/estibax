// Smoke test E2E contra la API viva: login -> activos -> salida -> confirmar -> revertir
const BASE = 'http://localhost:3000';
let token = '';
let pass = 0;
let fail = 0;

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(nombre, cond, extra) {
  if (cond) { pass++; console.log('PASS: ' + nombre); }
  else { fail++; console.log('FAIL: ' + nombre + (extra ? ' -> ' + JSON.stringify(extra) : '')); }
}

async function main() {
  // 1. Health
  const health = await req('GET', '/health');
  check('Health responde', health.status === 200, health);

  // 2. Login
  const login = await req('POST', '/auth/login', { email: 'admin@estibax.local', password: 'Admin123!' });
  check(
    'Login JWT',
    (login.status === 200 || login.status === 201) && login.data.access_token,
    login.data,
  );
  token = login.data.access_token;

  // 3. Login con credenciales invalidas debe fallar
  const bad = await req('POST', '/auth/login', { email: 'admin@estibax.local', password: 'incorrecta' });
  check('Login invalido rechazado (401)', bad.status === 401, bad.status);

  // 4. Sin token, endpoint protegido rechaza
  const saved = token;
  token = '';
  const noauth = await req('GET', '/activos');
  check('Endpoint protegido sin token (401)', noauth.status === 401, noauth.status);
  token = saved;

  // 5. Listar activos
  const activos = await req('GET', '/activos');
  const disponibles = (activos.data || []).filter(
    (a) => a.estadoLogistico === 'DISPONIBLE' && a.estadoOperativo === 'LIBRE',
  );
  check('Activos listados con al menos 1 disponible', activos.status === 200 && disponibles.length > 0, {
    total: (activos.data || []).length,
  });

  // 6. Clientes
  const clientes = await req('GET', '/clientes');
  const abc = (clientes.data || []).find((c) => c.nombre === 'Cliente ABC');
  check('Cliente ABC con reglas', !!abc && !!abc.reglasJson, clientes.data && clientes.data.map((c) => c.nombre));

  // 7. Crear SALIDA en borrador hacia Cliente ABC
  const activo = disponibles[0];
  const borrador = await req('POST', '/movimientos', {
    tipo: 'SALIDA',
    clienteId: abc.id,
    lineas: [{ activoId: activo.id, cantidad: 1 }],
  });
  check('Borrador de salida creado', borrador.status === 201 && borrador.data.estado === 'BORRADOR', borrador.data);
  const borradorId = borrador.data && borrador.data.id;

const FIRMA = { nombre: 'Juan Pérez', documento: '12345678', cargo: 'Recibidor' };

  // 8. Confirmar SIN firma debe fallar (entrega requiere firma electrónica)
  const confSinFirma = await req('POST', '/movimientos/' + borradorId + '/confirmar');
  check(
    'Confirmar salida SIN firma rechazado (400)',
    confSinFirma.status === 400,
    { status: confSinFirma.status, msg: confSinFirma.data },
  );

  // 9. Confirmar CON firma -> asigna documento consecutivo y guarda la firma
  const conf = await req('POST', '/movimientos/' + borradorId + '/confirmar', { firma: FIRMA });
  check(
    'Salida confirmada con documento SAL-xxxxxx',
    conf.status === 201 && /^SAL-\d{6}$/.test(conf.data.documento || ''),
    conf.data,
  );
  check(
    'Firma electrónica registrada',
    conf.data && conf.data.firmaNombre === FIRMA.nombre && conf.data.firmaDocumento === FIRMA.documento && conf.data.firmaCargo === FIRMA.cargo,
    conf.data && { firmaNombre: conf.data.firmaNombre, firmaDocumento: conf.data.firmaDocumento, firmaCargo: conf.data.firmaCargo },
  );

  // 10. El activo paso a EN_CLIENTE
  const actDespues = await req('GET', '/activos/' + activo.id);
  check('Activo en EN_CLIENTE tras salida', actDespues.data && actDespues.data.estadoLogistico === 'EN_CLIENTE', actDespues.data && actDespues.data.estadoLogistico);

  // 11. Revertir con motivo
  const rev = await req('POST', '/movimientos/' + borradorId + '/revertir', { motivo: 'Prueba E2E de reversion' });
  check('Reversion creada REV-xxxxxx', rev.status === 201 && /^REV-\d{6}$/.test(rev.data.documento || ''), rev.data);

  // 12. Original queda REVERTIDO
  const detalle = await req('GET', '/movimientos/' + borradorId);
  check('Original en estado REVERTIDO', detalle.data && detalle.data.estado === 'REVERTIDO', detalle.data && detalle.data.estado);

  // 13. DEVOLUCION del activo (valida regla EN_CLIENTE)
  const devB = await req('POST', '/movimientos', {
    tipo: 'DEVOLUCION',
    clienteId: abc.id,
    lineas: [{ activoId: activo.id, cantidad: 1 }],
  });
  const devBId = devB.data && devB.data.id;
  const dev = await req('POST', '/movimientos/' + devBId + '/confirmar', { firma: FIRMA });
  check(
    'Devolucion confirmada con documento DEV-xxxxxx',
    dev.status === 201 && /^DEV-\d{6}$/.test(dev.data.documento || ''),
    dev.data,
  );

  // 14. Activo vuelve a DISPONIBLE
  const actFinal = await req('GET', '/activos/' + activo.id);
  check('Activo vuelve a DISPONIBLE tras devolucion', actFinal.data && actFinal.data.estadoLogistico === 'DISPONIBLE', actFinal.data && actFinal.data.estadoLogistico);

  console.log('\nRESULTADO: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
