const { execSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  // Garantiza un estado conocido del seed antes de los E2E, que son destructivos
  // (confirman movimientos y cambian estado de activos de forma permanente).
  const backend = path.resolve(__dirname, '..', '..');
  execSync('node scripts/reset-bd.cjs', { cwd: backend, stdio: 'inherit' });
};