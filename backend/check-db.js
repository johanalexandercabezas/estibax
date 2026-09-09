// Verificacion de auditoria e integridad del Kardex contra la base de datos
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://estibax@localhost:5433/estibax';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const audit = await prisma.auditoria.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('--- AUDITORIA (ultimos registros) ---');
  for (const a of audit) {
    console.log(`${a.accion} | ${a.entidad}#${a.entidadId.slice(0, 8)} | usuario=${a.usuarioId.slice(0, 8)} | ${a.createdAt.toISOString()}`);
  }
  const auditoriaOk = audit.some((a) => a.accion === 'CONFIRMAR') && audit.some((a) => a.accion === 'REVERTIR');
  console.log(auditoriaOk ? 'PASS: Auditoria registra CONFIRMAR y REVERTIR' : 'FAIL: Auditoria incompleta');

  // Diseño ADR-006: la REVERSION lleva correccionDeId apuntando al original,
  // y el original queda en estado REVERTIDO.
  const reversiones = await prisma.movimiento.findMany({
    where: { tipo: 'REVERSION' },
    include: { correccionDe: true },
  });
  console.log('--- INMUTABILIDAD (reversiones enlazadas al original) ---');
  let reversionOk = reversiones.length > 0;
  for (const r of reversiones) {
    const original = r.correccionDe;
    const enlazada =
      original !== null &&
      original.estado === 'REVERTIDO' &&
      original.documento === (r.motivoCorreccion ? r.correccionDe?.documento : null);
    const docOriginal = original ? original.documento : '???';
    const estadoOriginal = original ? original.estado : '???';
    console.log(`${r.documento} -> original: ${docOriginal} (${estadoOriginal})`);
    if (!original || original.estado !== 'REVERTIDO') reversionOk = false;
  }
  console.log(reversionOk ? 'PASS: Cada reversion queda enlazada a su movimiento original revertido' : 'FAIL: Reversion sin enlace valido');

  const conHash = await prisma.movimiento.count({ where: { hashIntegridad: { not: null } } });
  console.log(conHash > 0 ? `PASS: ${conHash} movimientos con hash de integridad SHA-256` : 'FAIL: Sin hashes de integridad');

  const secuencias = await prisma.secuenciaDocumento.findMany();
  console.log('--- SECUENCIAS POR TIPO ---');
  for (const s of secuencias) {
    console.log(`${s.tipo}: ultimo=${s.ultimoNumero} prefijo=${s.prefijo}`);
  }

  process.exit(auditoriaOk && reversionOk && conHash > 0 ? 0 : 1);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

  
