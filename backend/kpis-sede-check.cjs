// Verifica jerarquía de sede en /activos (base de KPIs por sede) y sirve de smoke test
const BASE = 'http://127.0.0.1:3000';
(async () => {
  const login = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@estibax.local', password: 'Admin123!' }),
  });
  const { access_token } = await login.json();
  const res = await fetch(BASE + '/activos', { headers: { Authorization: `Bearer ${access_token}` } });
  const activos = await res.json();
  const lista = Array.isArray(activos) ? activos : activos.data ?? [];
  const porSede = new Map();
  let conSede = 0;
  for (const a of lista) {
    const sede = a.ubicacion?.bodega?.planta?.sede?.nombre ?? 'Sin sede';
    if (sede !== 'Sin sede') conSede++;
    porSede.set(sede, (porSede.get(sede) ?? 0) + 1);
  }
  console.log('Total activos:', lista.length);
  console.log('Con sede resuelta:', conSede);
  console.log('Distribución:', Object.fromEntries(porSede));
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
