const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Leer .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env = {};
for (const line of envLines) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
}

console.log('DATABASE_URL:', env.DATABASE_URL);

// Ejecutar migraciones
console.log('\n=== Aplicando migraciones ===\n');
try {
  const result = execSync('npx prisma migrate deploy', {
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, ...env },
    stdio: 'inherit'
  });
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}

console.log('\n=== Migraciones aplicadas ===');