// Prueba en vivo de los módulos activados
const BASE = 'http://localhost:3000';

async function main() {
  const l = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@estibax.local', password: 'Admin123!' }),
  });
  const d = await l.json();
  console.log('LOGIN', l.status);
  const t = d.access_token;

  const eps = [
    '/transportes/vehiculos',
    '/transportes/transportistas',
    '/economico/contratos',
    '/economico/liquidaciones',
    '/auditoria?limite=5',
    '/configuracion/empresa',
  ];
  for (const e of eps) {
    const r = await fetch(BASE + e, { headers: { Authorization: 'Bearer ' + t } });
    const j = await r.json();
    const resumen = Array.isArray(j)
      ? j.length + ' items'
      : Object.keys(j).join(',');
    console.log(e.padEnd(30), r.status, resumen);
  }

  // 403 esperado: operador no tiene permiso de auditoría/configuración
  const lo = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operador@estibax.local', password: 'Operador123!' }),
  });
  const to = (await lo.json()).access_token;
  const r403 = await fetch(BASE + '/auditoria', { headers: { Authorization: 'Bearer ' + to } });
  console.log('RBAC operador->/auditoria', r403.status, r403.status === 403 ? '(esperado 403)' : '');
}
main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
