# EstibaX

Plataforma empresarial para el control integral y trazabilidad profesional de estibas/palés y activos logísticos retornables.

## Stack tecnológico

- **Backend:** NestJS 10 + TypeScript 5
- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3
- **Base de datos:** PostgreSQL + Prisma ORM
- **Autenticación:** JWT + RBAC (roles y permisos granulares)
- **Swagger/OpenAPI:** documentación en `/api/docs`
- **PWA:** Service worker + manifest

## Estructura del monorepo

```text
/
├── backend/              # API NestJS
│   ├── src/
│   ├── test/
│   ├── scripts/
│   └── prisma/           # Schema y migraciones (Fase 2)
├── frontend/             # Aplicación React PWA
│   ├── src/
│   └── public/
├── docs/
│   └── adr/              # Decisiones arquitectónicas
├── scripts/              # Scripts compartidos
└── tests/                # Pruebas E2E compartidas
```

## Requisitos

- Node.js >= 20
- npm >= 10
- PostgreSQL >= 15 (para Fase 2)

## Instalación

### 1. Base de datos

Opción A — Docker:

```bash
docker compose up -d postgres
```

Opción B — PostgreSQL local:

Crear base de datos `estibax` con usuario/contraseña definidos en `backend/.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env   # ajustar DATABASE_URL
npm install
npm run prisma:migrate  # generar y aplicar migraciones
npm run prisma:seed     # datos de prueba
npm run build
npm run start:dev
```

### 3. Frontend

```bash
cd ../frontend
cp .env.example .env   # ajustar VITE_API_URL
npm install
npm run build
npm run dev
```

## Scripts de desarrollo

### Backend

```bash
npm run start:dev       # ts-node-dev con hot reload
npm run build           # Compilar con tsc
npm run start           # Iniciar con ts-node
npm run test            # Pruebas unitarias con Jest
npm run test:e2e        # Pruebas end-to-end con Supertest
npm run prisma:generate # Generar Prisma Client
npm run prisma:migrate  # Crear/aplicar migraciones
npm run prisma:seed     # Ejecutar seed de datos
npm run prisma:studio   # Explorar base de datos
```

### Frontend

```bash
npm run dev          # Servidor de desarrollo Vite
npm run build        # Build de producción
npm run preview      # Previsualizar build
npm run lint         # Verificar formato con Prettier
npm run format       # Formatear con Prettier
```

## Convenciones

- TypeScript en backend y frontend.
- Commits atómicos y descriptivos.
- ADRs obligatorios para decisiones arquitectónicas importantes en `docs/adr/`.
- Toda operación de escritura debe dejar traza de auditoría (Fase 3).
- El Kardex Central es inmutable; las correcciones son eventos nuevos.

## Estado actual

**Fase 1 completada:** monorepo inicializado, backend y frontend configurados, PWA básica lista.

**Fase 2 completada:** modelo de datos completo con Prisma (enterprise, cliente, activo, kardex, novedad, seguridad, auditoría), migración `0_init` aplicable, seed de datos, Docker Compose.

**Fase 3 completada:** autenticación JWT + bcrypt, RBAC con roles/permisos, CRUD de clientes y activos, motor de movimientos con borrador → confirmar → reversión auditada, numeración consecutiva por tipo (SAL-, DEV-, REV-, …), Kardex con hash SHA-256, auditoría completa, documentación Swagger.

**Fase 4 completada (PWA):** login, layout con sidebar responsive, Torre de Control (métricas e indicadores clicables), Activos (filtros y bloqueo), Clientes (reglas de despacho y balance de devoluciones), Operaciones/Kardex (crear, confirmar, revertir) y Novedades (reportar, investigar, resolver, inspección).

**Reglas de dominio implementadas:**
- Propiedad ≠ Custodia ≠ Ubicación (dimensiones independientes en `Activo`).
- Estados físico/logístico/operativo separados.
- Movimientos confirmados inmutables; correcciones solo por `REVERSION` auditada.
- **Obligación de devolución automática:** entregadas − devueltas = pendientes por cliente (desglose por propiedad), expuesto en `GET /clientes/:id/balance-devoluciones`.
- Reglas de despacho configurables por cliente (`reglasJson`), validadas en backend.
- **Daño bloquea automáticamente** el activo; la liberación exige **inspección humana** auditada (regla 7.7).
- **Firma electrónica** obligatoria en entregas (SALIDA/PRESTAMO) y devoluciones: nombre, documento, cargo y fecha/hora (sin GPS/fotografía en V1).
- **RBAC global y real:** `JwtAuthGuard` + `RolesGuard` globales; rutas públicas marcadas con `@Public()`. Permiso fino `LIBERAR_ACTIVO` para desbloquear y liberar reparaciones.
- **Portal del cliente:** rol `CLIENTE` con endpoints `/portal/*` que muestran solo sus activos, movimientos y balance de devolución.

## Verificación (scripts de prueba contra API y base de datos)

El backend incluye scripts autocontenidos (Node, sin dependencias extra):

```bash
cd backend
node smoke-e2e.js          # Flujo de negocio: login -> salida -> reversión -> devolución (15 checks)
node devolucion-check.js   # Obligación de devolución: entregadas - devueltas = pendientes (11 checks)
node novedad-check.js      # Ciclo daño -> bloqueo -> reparación -> inspección humana (16 checks)
node portal-check.js       # Portal del cliente + RBAC (8 checks)
node check-db.js           # Auditoría, inmutabilidad del Kardex y secuencias en base de datos
```

Todos requieren la API en `http://localhost:3000` y la base de datos configurada.

Usuarios de prueba (creados por el seed):
- **Admin:** `admin@estibax.local` / `Admin123!` (rol `ADMIN_EMPRESA`, con `LIBERAR_ACTIVO`).
- **Cliente:** `cliente@abc.local` / `Cliente123!` (rol `CLIENTE`, portal solo lectura).

## Documentación

- `ESPECIFICACION.md` — especificación funcional.
- `docs/adr/` — decisiones arquitectónicas.
- `backend/README.md` — detalles del backend.
- `frontend/README.md` — detalles del frontend.

## Licencia

UNLICENSED — Propiedad de EstibaX.
