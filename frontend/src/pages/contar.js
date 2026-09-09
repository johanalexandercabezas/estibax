const fs = require('fs');
const t = fs.readFileSync('Operaciones.tsx', 'utf8');
// strip line comments, block comments, template strings and strings (roughly)
let s = t.replace(/\/\/[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
let depth = 0;
let min = 0;
let line = 1;
for (let i = 0; i < s.length; i++) {
  if (s[i] === '\n') line++;
  const c = s[i];
  if (c === '{') { depth++; }
  else if (c === '}') { depth--; if (depth < min) { min = depth; console.log('UNDERFLOW at line', line); } }
  else if (c === '\'') { i = s.indexOf('\'', i + 1); if (i < 0) break; }
  else if (c === '"') { i = s.indexOf('"', i + 1); if (i < 0) break; }
}
console.log('final depth:', depth, 'min depth:', min);
console.log('last 40 lines braces around file end:');
const lines = s.split('\n');
for (let i = Math.max(0, lines.length - 30); i < lines.length; i++) {
  const d = (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
  if (d !== 0) console.log(i + 1, d, lines[i].trim().slice(0, 80));
}