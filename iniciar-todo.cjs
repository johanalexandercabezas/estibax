// ============================================================
// EstibaX - Arranque completo (PostgreSQL + Backend + Frontend)
// Compatible con Windows (incluye rutas con tildes/espacios).
// Uso: node iniciar-todo.cjs   o   doble clic en INICIAR-ESTIBAX.cmd
// ============================================================
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const PGBIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const PGDATA = path.join(BACKEND, '.pgdata');
const LOG_BD = path.join(BACKEND, '.pgdata', 'estibax.log');
const LOG_API = path.join(BACKEND, 'server-run.log');
const LOG_FE = path.join(ROOT, 'frontend-dev.log');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ejecuta un comando sin esperar el cierre de pipes (evita ETIMEDOUT de cmd)
function runSync(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 8000, windowsHide: true });
    return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
  } catch (e) {
    return { ok: false, out: e.message };
  }
}

// ¿PostgreSQL acepta conexiones en 5433?
function pgReady() {
  const r = runSync(path.join(PGBIN, 'pg_isready.exe'), ['-h', '127.0.0.1', '-p', '5433', '-U', 'estibax']);
  return r.ok && /aceptando|accepting/i.test(r.out);
}

// ¿Una URL HTTP responde (código 2xx/3xx)?
function httpOk(url) {
  const r = runSync('curl', ['-s', '-m', '2', '-o', 'NUL', '-w', '%{http_code}', url]);
  return r.ok && /^[23]\d\d$/.test(r.out.trim());
}

// Lanza un proceso en segundo plano (desacoplado) y devuelve su PID
function spawnDetached(cmd, args, cwd, logFile) {
  const fd = fs.openSync(logFile, 'a');
  const child = spawn(cmd, args, { cwd, detached: true, windowsHide: true, stdio: ['ignore', fd, fd] });
  child.unref();
  return child.pid;
}

async function waitFor(check, tries, stepMs, label) {
  for (let i = 0; i < tries; i++) {
    if (check()) return true;
    await sleep(stepMs);
  }
  return false;
}

async function main() {
  // Tiempo de seguridad: el arrancador siempre termina, pase lo que pase.
  const watchdog = setTimeout(() => {
    console.log('AVISO: se supero el tiempo maximo; revisa los logs.');
    process.exit(2);
  }, 75000);
  if (typeof watchdog.unref === 'function') watchdog.unref();

  console.log('==========================================');
  console.log('  EstibaX - Iniciando todos los servicios');
  console.log('==========================================');

  // ---------- 1. PostgreSQL ----------
  if (pgReady()) {
    console.log('[1/3] PostgreSQL YA estaba corriendo en :5433');
  } else {
    console.log('[1/3] Iniciando PostgreSQL en :5433 ...');
    // Se arranca desacoplado: pg_ctl no debe heredar la consola del script
    try {
      const child = spawn(
        path.join(PGBIN, 'pg_ctl.exe'),
        ['-D', PGDATA, '-l', LOG_BD, '-o', '-p 5433', '-w', 'start'],
        { detached: true, windowsHide: true, stdio: 'ignore' },
      );
      child.unref();
    } catch (e) {
      console.log('      No se pudo lanzar pg_ctl:', e.message);
    }
    const ok = await waitFor(pgReady, 24, 700, 'postgres');
    console.log(ok ? '      PostgreSQL OK' : '      PostgreSQL no levanto (revisar .pgdata\\estibax.log)');
  }

  // ---------- 2. Backend ----------
  if (httpOk('http://localhost:3000/health')) {
    console.log('[2/3] Backend YA estaba corriendo en :3000');
  } else {
    console.log('[2/3] Iniciando Backend NestJS en :3000 ...');
    const dist = path.join(BACKEND, 'dist', 'main.js');
    if (!fs.existsSync(dist)) {
      console.log('      Compilando (npm run build)...');
      spawnSync('npm', ['run', 'build'], { cwd: BACKEND, stdio: 'ignore', timeout: 120000, windowsHide: true });
    }
    const pid = spawnDetached('node', ['dist/main.js'], BACKEND, LOG_API);
    fs.writeFileSync(path.join(BACKEND, 'server.pid'), String(pid));
    console.log('      PID', pid);
    const ok = await waitFor(() => httpOk('http://localhost:3000/health'), 20, 500, 'backend');
    if (ok) {
      console.log('      Backend OK');
    } else {
      console.log('      ERROR: el backend no respondio. Ultimas lineas del log:');
      console.log('      ' + fs.readFileSync(LOG_API, 'utf8').split('\n').slice(-12).join('\n      '));
    }
  }

  // ---------- 3. Frontend ----------
  // Sirve la version compilada (dist/) con un servidor estatico propio.
  // Es mucho mas estable que el dev-server de Vite.
  if (httpOk('http://127.0.0.1:5173/')) {
    console.log('[3/3] Frontend YA estaba corriendo en :5173');
  } else {
    console.log('[3/3] Iniciando Frontend (produccion) en :5173 ...');
    const distIndex = path.join(FRONTEND, 'dist', 'index.html');
    if (!fs.existsSync(distIndex)) {
      console.log('      Compilando frontend (npm run build)...');
      spawnSync('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore', timeout: 180000, windowsHide: true });
    }
    if (!fs.existsSync(distIndex)) {
      console.log('      ERROR: no existe frontend/dist. Ejecuta: cd frontend && npm run build');
    } else {
      const pid = spawnDetached('node', ['servir-frontend.cjs'], FRONTEND, LOG_FE);
      fs.writeFileSync(path.join(ROOT, 'frontend.pid'), String(pid));
      console.log('      PID', pid);
      const ok = await waitFor(() => httpOk('http://127.0.0.1:5173/'), 20, 500, 'frontend');
      if (ok) console.log('      Frontend OK');
      else console.log('      ERROR: el frontend no respondio (ver frontend-dev.log)');
    }
  }

  const ready = httpOk('http://localhost:3000/health') && httpOk('http://127.0.0.1:5173/');
  console.log('');
  console.log('==========================================');
  if (ready) {
    console.log('  LISTO! Abre en tu navegador:  http://localhost:5173');
  } else {
    console.log('  ALGO NO LEVANTO (revisa los logs indicados).');
  }
  console.log('------------------------------------------');
  console.log('  admin@estibax.local     / Admin123!');
  console.log('  operador@estibax.local  / Operador123!');
  console.log('  cliente@abc.local       / Cliente123!');
  console.log('  API + Swagger: http://localhost:3000/api/docs');
  console.log('==========================================');

  // Dejar que los sockets/pipes se cierren solos y salir de forma controlada.
  // Ya no hay fetch en este script, por lo que process.exit es seguro.
  await sleep(800);
  process.exit(ready ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});