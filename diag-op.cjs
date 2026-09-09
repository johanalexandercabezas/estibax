// compila frontend tras la reparacion del ternario
const { execSync } = require('child_process');
try {
  const out = execSync('npx tsc -b', { encoding: 'utf8', timeout: 240000, cwd: 'frontend' });
  console.log('TSC_FRONT_OK');
  console.log(out.slice(-300));
} catch (e) {
  console.log('FRONT_SALIDA:');
  console.log(((e.stdout || '') + (e.stderr || e.message)).slice(-3000));
}
