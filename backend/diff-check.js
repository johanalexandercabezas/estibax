const fs = require('fs');
const t = fs.readFileSync('prisma/seed.ts', 'utf8');
const lines = t.split('\n');
console.log('TOTAL:', lines.length);
// Imprimir las lineas que empiezan secciones clave
lines.forEach((l, i) => {
  if (/^  \/\/ -+/.test(l) || /^main\(\)/.test(l) || /^async function/.test(l) || /console\.log\('Empresa/.test(l)) {
    console.log(String(i + 1).padStart(4), l.trim());
  }
});
