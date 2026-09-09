// Prueba de la obligación de devolución automática (decisión estructural #2)
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
  const login = await req('POST', '/auth/login', { email: 'admin@estibax.local', password: 'Admin123!' });
  check('Login', (login.status === 200 || login.status === 201) && !!login.data.access_token, login.data);
  token = login.data.access_token;

  const clientes = await req('GET', '/clientes');
  const abc = (clientes.data || []).find((c) => c.nombre === 'Cliente ABC');
  check('Cliente ABC encontrado', !!abc, clientes.data);

  const { id: clienteId } = abc;
  const b0 = await req('GET', `/clientes/${clienteId}/balance-devoluciones`);
  const base = b0.data;
  check('Balance inicial cargado', b0.status === 200 && typeof base.entregadas === 'number', b0.data);
  check(
    'Regla: pendientes = max(0, entregadas - devueltas) (inicial)',
    base.pendientes === Math.max(0, base.entregadas - base.devueltas),
    base,
  );

  // Conseguir un activo disponible
  const activos = await req('GET', '/activos');
  const disponible = (activos.data || []).find((a) => a.estadoLogistico === 'DISPONIBLE' && a.estadoOperativo === 'LIBRE');
  check('Hay activo disponible', !!disponible, activos.data && activos.data.length);

const FIRMA = { nombre: 'Juan Pérez', documento: '12345678', cargo: 'Recibidor' };

  // SALIDA confirmada
  const br = await req('POST', '/movimientos', {
    tipo: 'SALIDA', clienteId,
    lineas: [{ activoId: disponible.id, cantidad: 1 }],
  });
  const conf = await req('POST', '/movimientos/' + br.data.id + '/confirmar', { firma: FIRMA });
  check('Salida confirmada SAL-xxxxxx', /^SAL-\d{6}$/.test(conf.data.documento || ''), conf.data);

  const b1 = await req('GET', `/clientes/${clienteId}/balance-devoluciones`);
  check('Entregadas +1 tras salida', b1.data.entregadas === base.entregadas + 1, { antes: base.entregadas, despues: b1.data.entregadas });

  // DEVOLUCION confirmada
  const br2 = await req('POST', '/movimientos', {
    tipo: 'DEVOLUCION', clienteId,
    lineas: [{ activoId: disponible.id, cantidad: 1 }],
  });
  const conf2 = await req('POST', '/movimientos/' + br2.data.id + '/confirmar', { firma: FIRMA });
  check('Devolucion confirmada DEV-xxxxxx', /^DEV-\d{6}$/.test(conf2.data.documento || ''), conf2.data);

  const b2 = await req('GET', `/clientes/${clienteId}/balance-devoluciones`);
  check('Devueltas +1 tras devolucion', b2.data.devueltas === base.devueltas + 1, { antes: base.devueltas, despues: b2.data.devueltas });
  check(
    'Regla: pendientes = max(0, entregadas - devueltas) (final)',
    b2.data.pendientes === Math.max(0, b2.data.entregadas - b2.data.devueltas),
    b2.data,
  );
  check('Desglose por propiedad presente', Array.isArray(b2.data.porPropiedad) && b2.data.porPropiedad.length > 0, b2.data.porPropiedad);

  console.log('\nRESULTADO: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });