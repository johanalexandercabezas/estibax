// Prueba E2E del ciclo: daño -> bloqueo automático -> investigación -> reparación -> inspección humana
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

  const activos = await req('GET', '/activos');
  const activo = (activos.data || []).find((a) => a.estadoLogistico === 'DISPONIBLE' && a.estadoOperativo === 'LIBRE');
  check('Activo disponible encontrado', !!activo, activos.data && activos.data.map(a => a.codigo + ':' + a.estadoLogistico));

  // 1. Reportar daño: debe bloquear el activo automáticamente (regla 7.6)
  const nov = await req('POST', '/novedades', {
    activoId: activo.id,
    descripcion: 'Estiba dañada durante descarga (prueba E2E)',
    estadoFisico: 'DANADO',
  });
  check('Novedad creada en estado ABIERTA', nov.status === 201 && nov.data.estado === 'ABIERTA', nov.data);
  const novedadId = nov.data && nov.data.id;

  const a1 = await req('GET', '/activos/' + activo.id);
  check('Activo quedó DAÑADO (físico)', a1.data.estadoFisico === 'DANADO', a1.data && a1.data.estadoFisico);
  check('Activo quedó BLOQUEADO (operativo) al reportar daño', a1.data.estadoOperativo === 'BLOQUEADO', a1.data && a1.data.estadoOperativo);

const FIRMA = { nombre: 'Juan Pérez', documento: '12345678', cargo: 'Recibidor' };

  // 2. Intentar despachar el activo bloqueado debe fallar
  const clientes = await req('GET', '/clientes');
  const abc = (clientes.data || []).find((c) => c.nombre === 'Cliente ABC');
  const br = await req('POST', '/movimientos', {
    tipo: 'SALIDA', clienteId: abc.id,
    lineas: [{ activoId: activo.id, cantidad: 1 }],
  });
  const conf = await req('POST', '/movimientos/' + br.data.id + '/confirmar', { firma: FIRMA });
  check('Despacho de activo bloqueado rechazado', conf.status === 400, { status: conf.status, msg: conf.data });

  // 3. Investigación
  const inv = await req('POST', `/novedades/${novedadId}/investigar`, {
    causa: 'Maniobra inadecuada en descarga',
    responsable: 'Transportista externo',
  });
  check('Investigación registrada (EN_INVESTIGACION)', inv.status === 201 && inv.data.estado === 'EN_INVESTIGACION', inv.data && inv.data.estado);

  // 4. Resolver a REPARACION
  const res = await req('POST', `/novedades/${novedadId}/resolver`, {
    disposicion: 'REPARACION',
    valor: 60000,
  });
  check('Disposición REPARACION', res.status === 201 && res.data.disposicion === 'REPARACION', res.data && res.data.disposicion);

  const a2 = await req('GET', '/activos/' + activo.id);
  check('Activo en EN_REPARACION', a2.data.estadoLogistico === 'EN_REPARACION', a2.data && a2.data.estadoLogistico);
  check('Activo permanece BLOQUEADO durante reparación', a2.data.estadoOperativo === 'BLOQUEADO', a2.data && a2.data.estadoOperativo);

  // 5. Inspección humana: libera el activo
  const comp = await req('POST', `/novedades/${novedadId}/completar-reparacion`);
  check('Inspección humana cierra la novedad', comp.status === 201 && comp.data.estado === 'CERRADA', comp.data && comp.data.estado);

  const a3 = await req('GET', '/activos/' + activo.id);
  check('Activo vuelve a BUENO tras inspección', a3.data.estadoFisico === 'BUENO', a3.data && a3.data.estadoFisico);
  check('Activo vuelve a DISPONIBLE', a3.data.estadoLogistico === 'DISPONIBLE', a3.data && a3.data.estadoLogistico);
  check('Activo vuelve a LIBRE (desbloqueado)', a3.data.estadoOperativo === 'LIBRE', a3.data && a3.data.estadoOperativo);

  // 6. Ahora sí se puede despachar
  const br2 = await req('POST', '/movimientos', {
    tipo: 'SALIDA', clienteId: abc.id,
    lineas: [{ activoId: activo.id, cantidad: 1 }],
  });
  const conf2 = await req('POST', '/movimientos/' + br2.data.id + '/confirmar', { firma: FIRMA });
  check('Despacho permitido tras inspección', /^SAL-\d{6}$/.test(conf2.data.documento || ''), conf2.data);

  // 7. Listar novedades
  const lista = await req('GET', '/novedades');
  check('Novedad visible en el expediente', lista.status === 200 && lista.data.length > 0, lista.data && lista.data.length);

  console.log('\nRESULTADO: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });