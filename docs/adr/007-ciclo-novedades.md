# ADR 007 — Ciclo de daño, reparación e inspección humana (Novedades)

**Estado:** Aceptado  
**Fecha:** 2026-08-27

## Contexto

El Prompt Maestro exige un control integral de los activos retornables ante
daños, pérdidas y mermas. Los activos dañados deben quedar fuera de circulación
de forma inmediata y el restablecimiento a `BUENO` solo se permite tras una
inspección humana auditada (reglas 3.5 y 7.7). Se requiere además que toda la
investigación y resolución quede en un expediente por novedad.

## Decisión

Se implementa el módulo `Novedades` con el siguiente ciclo transaccional:

1. **Reportar daño** (`POST /novedades`): crea la novedad en estado `ABIERTA` y
   — en la misma transacción — marca el activo como `DAÑADO`/`CRITICO`
   (`estado_fisico`) y `BLOQUEADO` (`estado_operativo`). Con esto queda
   **prohibido su despacho** de forma automática (validación `validarDisponible`
   + política de despacho).
2. **Investigar** (`POST /novedades/:id/investigar`): registra causa y
   responsable; la novedad pasa a `EN_INVESTIGACION`.
3. **Resolver** (`POST /novedades/:id/resolver`): fija la disposición:
   - `REPARACION` → el activo pasa a `EN_REPARACION` (sigue bloqueado).
   - `BAJA` → el activo pasa a `BAJA` (estado logístico terminal).
   - `INDEMNIZACION` → se registra el monto usando el valor de reposición como base.
4. **Inspección humana** (`POST /novedades/:id/completar-reparacion`): solo
   después de esta acción la novedad se cierra (`CERRADA`) y el activo vuelve a
   `BUENO` / `LIBRE` / `DISPONIBLE`.

Todas las transiciones son escritas en `Auditoria` (`CREAR_NOVEDAD`,
`INVESTIGAR_NOVEDAD`, `RESOLVER_NOVEDAD`, `INSPECCION_HUMANA`). La IA/software
**nunca** libera un activo: el cierre exige la accion humana auditada.

## Consecuencias

- Ningún activo dañado puede seguir circulando (bloqueo automático, regla 7.6).
- El historial del activo (ficha 360°) refleja el ciclo completo en `Novedad` y
  en los registros de auditoría.
- La disposición `REPARACION` no implica desbloqueo: se libera únicamente tras
  la inspección.
- En V1 no se modelan evidencias adjuntas (documentos/adjuntos); se mantiene la
  descripción en texto y el campo `ubicacion_id` opcional para ubicaciones de
  cuarentena.