# Informe de Pruebas — EstibaX v1.0

**Fecha:** 2026-08-31 · **Alcance:** backend NestJS (unitarias + E2E contra PostgreSQL real).

## 1. Resumen ejecutivo

| Suite | Comando | Resultado |
| `operaciones-check.cjs` — Data Grid Operaciones E2E (catálogo, CRUD, duplicados, filtros, búsqueda) | **14/14** PASS |
|---|---|---|
| Unitarias (Jest) | `npm test` | ✅ **13/13** — 2 suites |
| E2E (Jest + supertest, BD real) | `npm run test:e2e` | ✅ **6/6** — 3 suites · **idempotente** (globalSetup resetea la BD antes de cada corrida) |
| Scripts de verificación de negocio | `node smoke-e2e.js`, `novedad-check.js`, `portal-check.js`, `devolucion-check.js`, `economico-check.js`, `check-db.js`, `cobros-check.cjs` | ✅ ~80 checks PASS |
| Cobros con algoritmo Excel (en vivo) | `node cobros-check.cjs` | ✅ **14/14** — 3 endpoints |
| Agrupación por sede (en vivo) | `node kpis-sede-check.cjs`, `novedades-sede-check.cjs` | ✅ 14/14 activos y 3/3 novedades con sede resuelta |
| Build backend / frontend | `npm run build` (ambos) | ✅ sin errores |

## 2. Pruebas unitarias (`src/activos/activos.service.spec.ts`)

Validan reglas de negocio puras con Prisma mockeado (13 tests):

- `validarDisponible`: acepta BUENO/DISPONIBLE/LIBRE; **rechaza BLOQUEADO (7.6)**, no-DISPONIBLE y CRITICO; 404 si no existe.
- `bloquear`/`desbloquear`: bloqueo idempotente rechazado; desbloqueo exige estado BLOQUEADO.
- Ficha 360°: incluye `lineas`, `novedades`, `kardexEntries` y jerarquía Sede→Planta→Bodega→Zona; 404 si no existe.
- `findAll`: aplica filtros de los 3 ejes de estado + propiedad.

## 3. Pruebas E2E (contra la API y PostgreSQL reales)

### `test/e2e/flujo-completo.e2e-spec.ts` — flujo crítico
1. Login JWT con usuario del seed.
2. Crear movimiento **BORRADOR** (SALIDA).
3. **Confirmar sin firma → 400** (regla 7.5).
4. **Confirmar con firma** → consecutivo `SAL-NNNNNN` y estado CONFIRMADO.
5. Detalle incluye **asiento kardex con hash SHA-256** (64 hex) y firma persistida.
6. **Reversión** → tipo `REVERSION` enlazada (`correccionDeId`); original queda `REVERTIDO` (regla 7.1 — nunca editado).
7. **Auditoría** contiene `CONFIRMAR` y `REVERTIR`.
8. **Consecutivo no se reutiliza** (7.4): el siguiente confirmado usa número estrictamente mayor.

### `test/e2e/ficha-activo.e2e-spec.ts` — ficha 360°
- Retorna código `EST-`, tipo de activo, propiedad y los 3 estados válidos.
- Jerarquía de ubicación completa (zona.bodega.planta.sede).
- Arrays de historial siempre presentes; 404 para ID inexistente.

### `test/app.e2e-spec.ts` — salud
- `/health` y `/health/db` responden 200 (Prisma mockeado).

## 4. Verificaciones de negocio (scripts de integración, corridas en vivo)

| Script | Qué valida | Resultado |
|---|---|---|
| `smoke-e2e.js` | login, salida con firma, 401 sin token, rechazo de reglas de despacho, reversión, devolución | 15/15 |
| `novedad-check.js` | daño → **bloqueo automático**, investigación, reparación, inspección humana libera | 16/16 |
| `portal-check.js` | portal del cliente aislado por `clienteId`; RBAC 403 para roles sin permiso | 8/8 |
| `devolucion-check.js` | entregadas − devueltas = pendientes por propiedad | 11/11 |
| `economico-check.js` | contratos, tarifas históricas, cobro diario, liquidación mensual | 5/5 |
| `cobros-check.cjs` | algoritmo Excel: clientes facturables (5), `generar-cobro`, liquidaciones con detalle diario por plataforma, regeneración idempotente | 14/14 |
| `crud-cf-check.cjs` | CRUD clientes facturables desde Configuración: crear, duplicado→400, editar tarifa/estado, tarifa negativa→400, limpieza | 7/7 |
| `kpis-sede-check.cjs` | 14/14 activos resuelven `Sede` en `/activos` (base del agrupamiento por plataforma) | PASS |
| `novedades-sede-check.cjs` | 3/3 novedades resuelven la sede del activo (base del reporte PDF por sede) | PASS |
| `check-db.js` | auditoría completa, reversiones enlazadas, hashes SHA-256 en 100% de movimientos, secuencias sin huecos | PASS |

## 5. Cobertura de criterios de aceptación (Prompt Maestro §11)

| Criterio | Evidencia |
|---|---|
| Registro de entradas/salidas/traslados/devoluciones | E2E flujo completo + smoke-e2e |
| Confirmados no editables, solo reversibles | E2E pasos 4-6, `check-db.js` |
| Numeración consecutiva automática y única | E2E pasos 3 y 7 |
| Reglas de despacho por cliente en backend | smoke-e2e (rechazo por propiedad) |
| Activo dañado se bloquea automáticamente | novedad-check |
| Reparación requiere inspección humana | novedad-check |
| Torre de control accionable | Dashboard con indicadores clicables |
| PWA instalable en móvil | manifest (iconos PNG 192/512, tema verde ICOLTRANS) + service worker v2 (navegaciones network-first, assets cache-first, **API nunca cacheada**) |
| Portal del cliente solo lectura | portal-check |
| Auditoría de toda operación | E2E paso 6 + check-db |
| Cobro mensual por plataforma con saldo diario × tarifa (algoritmo Excel) | `cobros-check.cjs` (14/14) + módulo Cobros en frontend |
| Gestión de clientes facturables y tarifas desde Configuración | `crud-cf-check.cjs` (7/7) + pestaña Clientes facturables |
| Inventarios y KPIs contextualizados por sede/plataforma | `kpis-sede-check.cjs` + módulos Inventarios/Indicadores |
| Reporte PDF de novedades con firma corporativa ICOLTRANS | `novedades-sede-check.cjs` + `Reportes.tsx`/`useReportes` |
| Exportación CSV de inventario por sede | `Inventarios.tsx` (resumen por sede + detalle de activos) |
| Alertas de novedades abiertas en el Dashboard | `Dashboard.tsx` (contextualizadas a sede activa) |
| Despacho con vehículo/transportista en movimientos | `despacho-check.cjs` (10/10) + columna "Despacho" en listado y PDF |
| Cierre de mes de cobros (protección contra regeneración) | `cierre-mes-check.cjs` (13/13) + botón/badge CERRADA en Cobros |
| Historial de periodos liquidados con navegación | `historial-check.cjs` (11/11) + tarjeta "Historial de periodos" en Cobros |

## 6. Limitaciones conocidas

- Sin pruebas de carga/stress (fuera de alcance V1).
- El E2E asume el seed cargado; en un entorno limpio ejecutar `npx prisma db seed` antes.
  > **Actualización:** ahora `npm run test:e2e` ejecuta `globalSetup` que resetea la BD (`scripts/reset-bd.cjs`) y re-seedea automáticamente, garantizando estado inicial conocido (activos DISPONIBLES).
- Los scripts `*.js` de verificación requieren el backend compilado y la BD arriba (no los ejecuta Jest).
