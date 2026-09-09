# ADR 008 — Firma electrónica, RBAC global y portal del cliente

**Estado:** Aceptado  
**Fecha:** 2026-08-28

## Contexto

El Prompt Maestro exige (decisión estructural #5 y sección 7.5) firma electrónica
en entregas y devoluciones (nombre, documento, cargo, fecha/hora, sin GPS ni
fotografía en V1). También exige RBAC granular y un portal del cliente de solo
lectura (criterio de aceptación). Durante la auditoría se detectó que el
`RolesGuard` estaba definido pero **nunca registrado**, por lo que los decoradores
`@Permisos`/`@Roles` no se aplicaban.

## Decisión

### 1. Firma electrónica

Se añaden columnas a `Movimiento`: `firma_nombre`, `firma_documento`,
`firma_cargo` y `firma_fecha`. En `confirmar`, los tipos `SALIDA`, `PRESTAMO` y
`DEVOLUCION` **exigen** la firma; si falta se rechaza con 400. La firma se
persiste en la misma transacción que la confirmación y queda cubierta por la
auditoría del movimiento.

### 2. RBAC global

- `JwtAuthGuard` se registra como guard global (primero) y omite las rutas
  marcadas con `@Public()`.
- `RolesGuard` se registra como guard global (después) y lee `request.user`.
- Rutas públicas: `/health`, `/health/db`, `/auth/login`, `/auth/register`.
- Se añade el permiso fino `liberaciones → LIBERAR_ACTIVO` al rol administrador,
  exigido por `POST /activos/:id/desbloquear` y
  `POST /novedades/:id/completar-reparacion` (la inspección humana).

### 3. Portal del cliente

- `Usuario` gana `cliente_id` (FK opcional a `Cliente`).
- Rol `CLIENTE` con permiso único `portal → read`.
- Endpoints `GET /portal/mis-activos`, `/portal/mis-movimientos`, `/portal/balance`
  filtrados por el `clienteId` del token. Si el usuario no está vinculado a un
  cliente, se devuelve 403.

## Consecuencias

- El RBAC ahora es real y por defecto cierra el acceso: cualquier ruta sin
  `@Public()` y sin permiso explícito devuelve 401/403.
- La liberación de un activo exige `LIBERAR_ACTIVO`, reforzando la regla de que
  solo un humano autorizado libera activos (regla 7.6/7.7).
- El token JWT transporta `clienteId`, permitiendo el aislamiento por cliente en
  el portal sin consultas adicionales de autorización.
- Las entregas y devoluciones ya no pueden confirmarse sin firma electrónica.