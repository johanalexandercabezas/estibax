/* E2E: flujo completo SALIDA -> validaciones -> DEVOLUCION -> REVERSION */
const BASE = 'http://localhost:3000';
let token = '';
let passed = 0;
let failed = 0;

function ok(name, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('\n== 1. Health check ==');
  const health = await req('GET', '/health');
  ok('GET /health responde 200', health.status === 200, JSON.stringify(health.data));

  console.log('\n== 2. Login ==');
  const login = await req('POST', '/auth/login', {
    email: 'admin@estibax.local',
    password: 'Admin123!',
  });
  ok('POST /auth/login responde 200/201', login.status === 200 || login.status === 201, JSON.stringify(login.data));
  token = login.data?.access_token;
  ok('Token JWT recibido', Boolean(token));

  console.log('\n== 3. Datos maestros ==');
  const clientes = await req('GET', '/clientes');
  ok('GET /clientes responde 200', clientes.status === 200);
  const abc = (clientes.data || []).find((c) => c.nombre === 'Cliente ABC');
  const xyz = (clientes.data || []).find((c) => c.nombre === 'Cliente XYZ');
  ok('Cliente ABC existe', Boolean(abc));
  ok('Cliente XYZ existe', Boolean(xyz));

  const activos = await req('GET', '/activos');
  ok('GET /activos responde 200', activos.status === 200);
  const libres = (activos.data || []).filter(
    (a) => a.estadoLogistico === 'DISPONIBLE' && a.estadoOperativo === 'LIBRE' && a.propiedad === 'PROPIA',
  );
  ok('Hay al menos 2 activos PROPIA disponibles', libres.length >= 2, `encontrados: ${libres.length}`);
  const activo1 = libres[0];
  const activo2 = libres[1];

  console.log('\n== 4. SALIDA a Cliente ABC (válido) ==');
  const borrador = await req('POST', '/movimientos', {
    tipo: 'SALIDA',
    clienteId: abc.id,
    lineas: [{ activoId: activo1.id, cantidad: 1 }],
  });
  ok('POST /movimientos crea borrador', borrador.status === 200 || borrador.status === 201, JSON.stringify(borrador.data));
  ok('Estado inicial BORRADOR', borrador.data?.estado === 'BORRADOR');
  ok('Borrador sin documento definitivo', (borrador.data?.documento || '').startsWith('BORRADOR-'));

  const confirmada = await req('POST', `/movimientos/${borrador.data.id}/confirmar`);
  ok('Confirmación responde 200/201', confirmada.status === 200 || confirmada.status === 201, JSON.stringify(confirmada.data));
  ok('Documento consecutivo SAL asignado', (confirmada.data?.documento || '').startsWith('SAL-'), confirmada.data?.documento);
  ok('Estado CONFIRMADO', confirmada.data?.estado === 'CONFIRMADO');
  ok('Hash de integridad presente', Boolean(confirmada.data?.hashIntegridad));
  ok('Kardex entry generado', (confirmada.data?.kardexEntries || []).length >= 1);

  const det1 = await req('GET', `/activos/${activo1.id}`);
  ok('Activo quedó EN_CLIENTE', det1.data?.estadoLogistico === 'EN_CLIENTE', det1.data?.estadoLogistico);
  ok('Activo asignado al cliente ABC', det1.data?.cliente?.id === abc.id || det1.data?.clienteId === abc.id);

  console.log('\n== 5. Reglas de negocio: rechazos ==');
  const rechazo1 = await req('POST', '/movimientos', {
    tipo: 'SALIDA',
    clienteId: abc.id,
    lineas: [{ activoId: activo1.id, cantidad: 1 }],
  });
  const c1 = rechazo1.status >= 400 ? rechazo1 : await req('POST', `/movimientos/${rechazo1.data?.id}/confirmar`);
  ok('SALIDA de activo no disponible es rechazada', c1.status === 400, `status=${c1.status}`);

  const rechazo2 = await req('POST', '/movimientos', {
    tipo: 'SALIDA',
    clienteId: xyz.id,
    lineas: [{ activoId: activo2.id, cantidad: 1 }],
  });
  const c2 = rechazo2.status >= 400 ? rechazo2 : await req('POST', `/movimientos/${rechazo2.data?.id}/confirmar`);
  ok('SALIDA de estiba PROPIA a Cliente XYZ (no permitido) es rechazada', c2.status === 400, `status=${c2.status} msg=${c2.data?.message}`);

  console.log('\n== 6. DEVOLUCIÓN desde Cliente ABC ==');
  const dev = await req('POST', '/movimientos', {
    tipo: 'DEVOLUCION',
    clienteId: abc.id,
    lineas: [{ activoId: activo1.id, cantidad: 1 }],
  });
  ok('Devolución: borrador creado', dev.status === 200 || dev.status === 201, JSON.stringify(dev.data));
  const devC = await req('POST', `/movimientos/${dev.data.id}/confirmar`);
  ok('Devolución confirmada', devC.status === 200 || devC.status === 201, JSON.stringify(devC.data));
  ok('Documento consecutivo DEV asignado', (devC.data?.documento || '').startsWith('DEV-'), devC.data?.documento);
  const det2 = await req('GET', `/activos/${activo1.id}`);
  ok('Activo devuelto quedó DISPONIBLE', det2.data?.estadoLogistico === 'DISPONIBLE', det2.data?.estadoLogistico);

  console.log('\n== 7. Reversión auditada de la SALIDA ==');
  const rev = await req('POST', `/movimientos/${borrador.data.id}/revertir`, {
    motivo: 'Prueba E2E: error de digitación',
  });
  ok('Reversión responde 200/201', rev.status === 200 || rev.status === 201, JSON.stringify(rev.data));
  ok('Documento de reversión REV asignado', (rev.data?.documento || '').startsWith('REV-'), rev.data?.documento);
  ok('Reversión CONFIRMADA', rev.data?.estado === 'CONFIRMADO');
  ok('Reversión referenciada al original', rev.data?.correccionDeId === borrador.data.id);

  const movRev = await req('GET', `/movimientos/${borrador.data.id}`);
  ok('Movimiento original marcado REVERTIDO', movRev.data?.estado === 'REVERTIDO');

  console.log('\n== 8. Autorización: sin token ==');
  const saved = token;
  token = '';
  const sinAuth = await req('GET', '/activos');
  ok('GET /activos sin token es 401', sinAuth.status === 401, `status=${sinAuth.status}`);
  token = saved;

  console.log(`\n========== RESULTADO: ${passed} PASS / ${failed} FAIL ==========\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('ERROR FATAL:', e.message);
  process.exit(1);
});
