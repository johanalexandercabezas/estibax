// Verifica que GET /novedades devuelva la jerarquía de sede (base para reporte PDF por sede)
const BASE = 'http://127.0.0.1:3000';
(async () => {
  const login = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@estibax.local', password: 'Admin123!' }),
  });
  const { access_token } = await login.json();
  const res = await fetch(BASE + '/novedades', { headers: { Authorization: `Bearer ${access_token}` } });
  const novedades = await res.json();
  const lista = Array.isArray(novedades) ? novedades : novedades.data ?? [];
  console.log('Total novedades:', lista.length);
  let conSede = 0;
  for (const n of lista) {
    const sede = n.activo?.ubicacion?.bodega?.planta?.sede?.nombre ?? null;
    if (sede) conSede++;
    console.log(`  ${n.activo?.codigo ?? '?'} | estado=${n.estado} | disp=${n.disposicion ?? '-'} | sede=${sede ?? 'SIN SEDE'}`);
  }
  console.log('Con sede resuelta:', conSede);
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });