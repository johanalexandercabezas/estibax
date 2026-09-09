// Genera iconos PNG 192 y 512 para la PWA (sin dependencias: zlib + CRC32 de Node)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Rasteriza la "E" del favicon (verde #16A34A sobre blanco no: fondo verde, E blanca)
function makePng(size) {
  const s = size / 64;
  const fondo = [22, 163, 74]; // #16A34A verde corporativo
  const blanco = [255, 255, 255];
  const rects = [
    [14, 22, 36, 6], // barra superior
    [14, 29, 6, 18], // barra izquierda
    [29, 29, 6, 18], // barra central
    [44, 29, 6, 18], // barra derecha
  ];
  const raw = Buffer.alloc(size * (1 + size * 3)); // RGB, filter 0 por fila
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      const u = x / s;
      const v = y / s;
      let color = fondo;
      for (const [rx, ry, rw, rh] of rects) {
        if (u >= rx && u < rx + rw && v >= ry && v < ry + rh) { color = blanco; break; }
      }
      raw[px] = color[0];
      raw[px + 1] = color[1];
      raw[px + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    firma,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });
for (const size of [192, 512]) {
  const destino = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(destino, makePng(size));
  console.log(`Generado ${path.relative(__dirname, destino)} (${fs.statSync(destino).size} bytes)`);
}