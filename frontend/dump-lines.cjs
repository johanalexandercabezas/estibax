const fs = require('fs');
const l = fs.readFileSync('src/pages/Movimientos.tsx', 'utf8').split('\n');
// Buscar línea del interface Movimiento
for (let i = 0; i < l.length; i++) {
  if (l[i].includes('interface Movimiento')) {
    console.log('LINTER: Movimiento en línea', i + 1);
    console.log(l.slice(i, i + 20).join('\n'));
    break;
  }
}



