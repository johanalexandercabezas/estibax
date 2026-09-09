// Reset de BD para pruebas E2E: borra datos transaccionales (respetando FKs) y
// re-ejecuta el seed para partir de un estado conocido (activos DISPONIBLES).
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function main() {
  console.log('Reseteando base de datos para E2E...');
  // Borrado en orden inverso a las FKs
  await prisma.liquidacionDetalle.deleteMany();
  await prisma.liquidacionCF.deleteMany();
  await prisma.cobroDiario.deleteMany();
  await prisma.kardexEntry.deleteMany();
  await prisma.movimientoLinea.deleteMany();
  await prisma.movimiento.deleteMany();
  await prisma.novedad.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.activo.deleteMany();
  await prisma.clienteFacturable.deleteMany();
  await prisma.tarifa.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.rol.deleteMany();
  await prisma.vehiculo.deleteMany();
  await prisma.transportista.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.tipoActivo.deleteMany();
  await prisma.zona.deleteMany();
  await prisma.bodega.deleteMany();
  await prisma.planta.deleteMany();
  await prisma.sede.deleteMany();
  await prisma.empresa.deleteMany();
  console.log('Datos transaccionales eliminados. Re-seedando...');

  // Re-seed (idempotente, ahora recrea todo en estado limpio)
  execSync('npx prisma db seed', { stdio: 'inherit' });

  const total = await prisma.activo.count();
  console.log(`Reset completado. Activos en BD: ${total}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error en reset:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});