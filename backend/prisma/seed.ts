// Seed de datos para EstibaX.
// Crea: empresa, ubicaciones, tipos de activo, clientes con reglas, contrato con tarifas,
// activos disponibles, roles (RBAC) y usuarios (admin, operador y portal cliente).
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Permisos en formato { modulo: [acciones] } usado por RolesGuard
const PERMISOS_ADMIN = {
  activos: ['read', 'write'],
  clientes: ['read', 'write'],
  movimientos: ['read', 'write'],
  novedades: ['read', 'write'],
  kardex: ['read'],
  economico: ['read', 'write'],
  transportes: ['read', 'write'],
  configuracion: ['read', 'write'],
  auditoria: ['read'],
  liberaciones: ['LIBERAR_ACTIVO'],
};

const PERMISOS_OPERADOR = {
  activos: ['read', 'write'],
  clientes: ['read'],
  movimientos: ['read', 'write'],
  novedades: ['read', 'write'],
  kardex: ['read'],
};

const PERMISOS_CONSULTA = {
  activos: ['read'],
  clientes: ['read'],
  movimientos: ['read'],
  kardex: ['read'],
};

// El portal del cliente NO tiene permiso 'activos' ni 'movimientos' (403 en admin)
const PERMISOS_CLIENTE = {
  portal: ['read'],
};

async function main() {
  console.log('Sembrando datos de EstibaX...');

  const empresa = await prisma.empresa.upsert({
    where: { nit: '900123456-1' },
    update: { nombre: 'INDUSTRIA COLOMBIANA DE LOGISTICA Y TRANSPORTE (ICOLTRANS)' },
    create: {
      nombre: 'INDUSTRIA COLOMBIANA DE LOGISTICA Y TRANSPORTE (ICOLTRANS)',
      nit: '900123456-1',
    },
  });
  console.log('Empresa:', empresa.nombre);

  // Plataformas/sedes nacionales de ICOLTRANS
  const PLATAFORMAS = [
    'Barranquilla',
    'Cota',
    'Girón',
    'Ibagué',
    'Itagüí',
    'Montería',
    'Pereira',
    'Yumbo',
  ];

  // La sede histórica "Sede Medellín" pasa a llamarse Itagüí (conserva sus activos)
  await prisma.sede.updateMany({
    where: { empresaId: empresa.id, nombre: 'Sede Medellín' },
    data: { nombre: 'Itagüí' },
  });

  // Crear la jerarquía de cada plataforma que falte: Planta Central → Bodega Principal → Zonas A y B
  for (const nombre of PLATAFORMAS) {
    let sedePlataforma = await prisma.sede.findFirst({
      where: { empresaId: empresa.id, nombre },
    });
    if (!sedePlataforma) {
      sedePlataforma = await prisma.sede.create({ data: { empresaId: empresa.id, nombre } });
    }
    let plantaP = await prisma.planta.findFirst({
      where: { sedeId: sedePlataforma.id, nombre: 'Planta Central' },
    });
    if (!plantaP) {
      plantaP = await prisma.planta.create({ data: { sedeId: sedePlataforma.id, nombre: 'Planta Central' } });
    }
    let bodegaP = await prisma.bodega.findFirst({
      where: { plantaId: plantaP.id, nombre: 'Bodega Principal' },
    });
    if (!bodegaP) {
      bodegaP = await prisma.bodega.create({ data: { plantaId: plantaP.id, nombre: 'Bodega Principal' } });
    }
    for (const zonaNombre of ['Zona A', 'Zona B']) {
      const zonaP = await prisma.zona.findFirst({
        where: { bodegaId: bodegaP.id, nombre: zonaNombre },
      });
      if (!zonaP) {
        await prisma.zona.create({ data: { bodegaId: bodegaP.id, nombre: zonaNombre } });
      }
    }
  }
  console.log(`Sedes/plataformas listas: ${PLATAFORMAS.join(', ')}`);

  // Sede de trabajo por defecto para el resto del seed (Itagüí)
  let sede = await prisma.sede.findFirst({ where: { empresaId: empresa.id, nombre: 'Itagüí' } });
  if (!sede) throw new Error('Sede Itagüí no encontrada tras el seed de plataformas');

  let planta = await prisma.planta.findFirst({ where: { sedeId: sede.id, nombre: 'Planta Central' } });
  if (!planta) planta = await prisma.planta.create({ data: { sedeId: sede.id, nombre: 'Planta Central' } });

  let bodega = await prisma.bodega.findFirst({ where: { plantaId: planta.id, nombre: 'Bodega Principal' } });
  if (!bodega) bodega = await prisma.bodega.create({ data: { plantaId: planta.id, nombre: 'Bodega Principal' } });

  let zonaA = await prisma.zona.findFirst({ where: { bodegaId: bodega.id, nombre: 'Zona A' } });
  if (!zonaA) zonaA = await prisma.zona.create({ data: { bodegaId: bodega.id, nombre: 'Zona A' } });

  let zonaB = await prisma.zona.findFirst({ where: { bodegaId: bodega.id, nombre: 'Zona B' } });
  if (!zonaB) zonaB = await prisma.zona.create({ data: { bodegaId: bodega.id, nombre: 'Zona B' } });

  // Tipos de activo
  const tipoEstiba = await prisma.tipoActivo.upsert({
    where: { id: 'tipo-estiba-plastica' },
    update: {},
    create: { id: 'tipo-estiba-plastica', nombre: 'Estiba plástica', descripcion: 'Estiba plástica retornable 1200x1000' },
  });
  const tipoJaula = await prisma.tipoActivo.upsert({
    where: { id: 'tipo-jaula-metalica' },
    update: {},
    create: { id: 'tipo-jaula-metalica', nombre: 'Jaula metálica', descripcion: 'Jaula metálica plegable' },
  });

  // Clientes con reglas de despacho
  let abc = await prisma.cliente.findFirst({ where: { empresaId: empresa.id, nombre: 'Cliente ABC' } });
  if (!abc) {
    abc = await prisma.cliente.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Cliente ABC',
        documento: '900111222-3',
        email: 'contacto@abc.local',
        telefono: '3001112233',
        reglasJson: JSON.stringify({
          puede_recibir_propias: true,
          puede_recibir_ercol: true,
          puede_recibir_tercero: true,
          cantidad_maxima: 50,
          requiere_aval: false,
        }),
      },
    });
  }
  console.log('Cliente:', abc.nombre);

  let xyz = await prisma.cliente.findFirst({ where: { empresaId: empresa.id, nombre: 'Cliente XYZ' } });
  if (!xyz) {
    xyz = await prisma.cliente.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Cliente XYZ',
        documento: '900333444-5',
        email: 'contacto@xyz.local',
        reglasJson: JSON.stringify({
          puede_recibir_propias: true,
          puede_recibir_ercol: false,
          puede_recibir_tercero: true,
          cantidad_maxima: 20,
          requiere_aval: true,
        }),
      },
    });
  }

  // Clientes facturables (algoritmo de cobros Excel): nombre debe coincidir con Cliente
  const CLIENTES_FACTURABLES: Array<{ nombre: string; tarifaDiaria: number }> = [
    { nombre: 'C.I. FLORA FOOD COLOMBIA SAS', tarifaDiaria: 233 },
    { nombre: 'NESTLE PURINA DE COLOMBIA SA', tarifaDiaria: 163.5 },
    { nombre: 'S C JOHNSON & SON COLOMBIANA SA', tarifaDiaria: 168 },
    { nombre: 'KENVUE COLOMBIA SA', tarifaDiaria: 240.5 },
    { nombre: 'LABORATORIOS COFARMA SA', tarifaDiaria: 270 },
  ];
  for (const cf of CLIENTES_FACTURABLES) {
    await prisma.clienteFacturable.upsert({
      where: { nombre: cf.nombre },
      update: { tarifaDiaria: cf.tarifaDiaria, empresaId: empresa.id },
      create: { empresaId: empresa.id, nombre: cf.nombre, tarifaDiaria: cf.tarifaDiaria },
    });
  }
  console.log('Clientes facturables listos:', CLIENTES_FACTURABLES.map((c) => c.nombre).join(', '));

  // Contrato y tarifas historicas
  let contrato = await prisma.contrato.findFirst({
    where: { empresaId: empresa.id, clienteId: abc.id },
  });
  if (!contrato) {
    contrato = await prisma.contrato.create({
      data: {
        empresaId: empresa.id,
        clienteId: abc.id,
        tipo: 'CUSTODIA',
        fechaInicio: new Date(Date.UTC(2026, 0, 1)),
      },
    });
    await prisma.tarifa.createMany({
      data: [
        { contratoId: contrato.id, tipoActivoId: tipoEstiba.id, valor: 800, fechaVigencia: new Date(Date.UTC(2026, 0, 1)) },
        { contratoId: contrato.id, tipoActivoId: tipoEstiba.id, valor: 1000, fechaVigencia: new Date(Date.UTC(2026, 7, 1)) },
        { contratoId: contrato.id, tipoActivoId: tipoJaula.id, valor: 1500, fechaVigencia: new Date(Date.UTC(2026, 0, 1)) },
      ],
    });
  }
  console.log('Contrato:', contrato.id);

  // Activos disponibles en bodega
  const activosExistentes = await prisma.activo.count({ where: { empresaId: empresa.id } });
  if (activosExistentes === 0) {
    const activos: any[] = [];
    for (let i = 1; i <= 10; i++) {
      activos.push({
        empresaId: empresa.id,
        codigo: 'EST-' + String(i).padStart(5, '0'),
        tipoActivoId: tipoEstiba.id,
        propiedad: i % 3 === 0 ? 'ERCOL' : 'PROPIA',
        valorAdquisicion: 250000,
        valorReposicion: 300000,
        ubicacionId: i % 2 === 0 ? zonaA.id : zonaB.id,
      });
    }
    for (let i = 1; i <= 4; i++) {
      activos.push({
        empresaId: empresa.id,
        codigo: 'JAUL-' + String(i).padStart(5, '0'),
        tipoActivoId: tipoJaula.id,
        propiedad: 'PROPIA',
        valorAdquisicion: 800000,
        valorReposicion: 950000,
        ubicacionId: zonaA.id,
      });
    }
    await prisma.activo.createMany({ data: activos });
    console.log('Activos creados:', activos.length);
  } else {
    console.log('Activos ya existen:', activosExistentes);
  }

  // Vehículos y transportistas (módulo Transportes)
  const vehiculos = [
    { empresaId: empresa.id, placa: 'KXP-482', tipo: 'PROPIO' },
    { empresaId: empresa.id, placa: 'MZR-915', tipo: 'TERCERO' },
  ];
  for (const v of vehiculos) {
    const existe = await prisma.vehiculo.findFirst({ where: { empresaId: empresa.id, placa: v.placa } });
    if (!existe) await prisma.vehiculo.create({ data: v });
  }
  const transportistas = [
    { empresaId: empresa.id, nombre: 'Transportes Gómez S.A.S.', documento: '900333444-5' },
    { empresaId: empresa.id, nombre: 'Juan Pérez (particular)', documento: '1039887766' },
  ];
  for (const t of transportistas) {
    const existe = await prisma.transportista.findFirst({
      where: { empresaId: empresa.id, nombre: t.nombre },
    });
    if (!existe) await prisma.transportista.create({ data: t });
  }
  console.log('Vehículos y transportistas listos');

  // Roles RBAC
  const rolAdmin = await prisma.rol.upsert({
    where: { id: 'rol-admin' },
    update: { permisos: JSON.stringify(PERMISOS_ADMIN) },
    create: { id: 'rol-admin', empresaId: empresa.id, nombre: 'ADMIN', permisos: JSON.stringify(PERMISOS_ADMIN) },
  });
  const rolOperador = await prisma.rol.upsert({
    where: { id: 'rol-operador' },
    update: { permisos: JSON.stringify(PERMISOS_OPERADOR) },
    create: { id: 'rol-operador', empresaId: empresa.id, nombre: 'OPERADOR', permisos: JSON.stringify(PERMISOS_OPERADOR) },
  });
  await prisma.rol.upsert({
    where: { id: 'rol-consulta' },
    update: { permisos: JSON.stringify(PERMISOS_CONSULTA) },
    create: { id: 'rol-consulta', empresaId: empresa.id, nombre: 'CONSULTA', permisos: JSON.stringify(PERMISOS_CONSULTA) },
  });
  const rolCliente = await prisma.rol.upsert({
    where: { id: 'rol-cliente' },
    update: { permisos: JSON.stringify(PERMISOS_CLIENTE) },
    create: { id: 'rol-cliente', empresaId: empresa.id, nombre: 'CLIENTE', permisos: JSON.stringify(PERMISOS_CLIENTE) },
  });
  console.log('Roles listos');

  // Usuarios
  const adminHash = await bcrypt.hash('Admin123!', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@estibax.local' },
    update: { passwordHash: adminHash, rolId: rolAdmin.id },
    create: {
      empresaId: empresa.id,
      rolId: rolAdmin.id,
      nombre: 'Administrador',
      email: 'admin@estibax.local',
      passwordHash: adminHash,
    },
  });

  const opHash = await bcrypt.hash('Operador123!', 10);
  await prisma.usuario.upsert({
    where: { email: 'operador@estibax.local' },
    update: { passwordHash: opHash, rolId: rolOperador.id },
    create: {
      empresaId: empresa.id,
      rolId: rolOperador.id,
      nombre: 'Operador Bodega',
      email: 'operador@estibax.local',
      passwordHash: opHash,
    },
  });

  const cliHash = await bcrypt.hash('Cliente123!', 10);
  await prisma.usuario.upsert({
    where: { email: 'cliente@abc.local' },
    update: { passwordHash: cliHash, clienteId: abc.id },
    create: {
      empresaId: empresa.id,
      rolId: rolCliente.id,
      nombre: 'Portal Cliente ABC',
      email: 'cliente@abc.local',
      passwordHash: cliHash,
      clienteId: abc.id,
    },
  });
  console.log('Usuarios listos');
  console.log('  Login admin:    admin@estibax.local / Admin123!');
  console.log('  Login operador: operador@estibax.local / Operador123!');
  console.log('  Login portal:   cliente@abc.local / Cliente123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
