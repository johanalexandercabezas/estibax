// Prueba del portal del cliente (rol CLIENTE, solo lectura de sus activos)
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
  // Login como cliente portal
  const login = await req('POST', '/auth/login', { email: 'cliente@abc.local', password: 'Cliente123!' });
  check('Login portal cliente', (login.status === 200 || login.status === 201) && !!login.data.access_token, login.data);
  token = login.data.access_token;
  check('Token incluye clienteId', !!login.data.usuario.clienteId, login.data.usuario);

  // El portal devuelve los activos del cliente (puede estar vacío si no hay custodia)
  const misActivos = await req('GET', '/portal/mis-activos');
  check('GET /portal/mis-activos OK', misActivos.status === 200, misActivos.data);
  check('Mis activos son un arreglo', Array.isArray(misActivos.data), misActivos.data);

  const balance = await req('GET', '/portal/balance');
  check('GET /portal/balance OK', balance.status === 200 && typeof balance.data.pendientes === 'number', balance.data);

  const movs = await req('GET', '/portal/mis-movimientos');
  check('GET /portal/mis-movimientos OK', movs.status === 200 && Array.isArray(movs.data), movs.data);

  // Un CLIENTE no puede acceder al módulo admin (activos) porque no tiene permiso 'activos'
  const activosAdmin = await req('GET', '/activos');
  check('Cliente NO accede a /activos (403)', activosAdmin.status === 403, { status: activosAdmin.status });

  // Un CLIENTE no puede escribir movimientos
  const crear = await req('POST', '/movimientos', { tipo: 'ENTRADA', lineas: [] });
  check('Cliente NO puede crear movimientos (403)', crear.status === 403, { status: crear.status });

  console.log('\nRESULTADO: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });