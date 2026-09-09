# ADR 006 — Inmutabilidad y Reversión del Kardex

**Proyecto:** EstibaX  
**Estado:** Aceptado  
**Fecha:** 2026-08-27

## Contexto

El Kardex Central es el ledger operacional de verdad. Para garantizar trazabilidad, los movimientos confirmados no pueden editarse ni eliminarse destructivamente.

## Decisión

- Todo movimiento confirmado queda con estado `CONFIRMADO` de forma permanente.
- Una corrección genera un movimiento de tipo `REVERSION` que referencia al original.
- El movimiento original se marca como `REVERTIDO`.
- Después de la reversión se puede crear un nuevo movimiento correcto.
- Cada asiento del ledger incluye hash de integridad.

## Consecuencias

- El historial siempre es completo y auditado.
- Los saldos se reconstruyen a partir de movimientos no revertidos.
- Las correcciones son explícitas y trazables.

## Flujo de corrección

```text
Movimiento A (CONFIRMADO)
    ↓
Reversión de A (CONFIRMADO)  → A queda REVERTIDO
    ↓
Movimiento B (CONFIRMADO)    → movimiento correcto
```

## Relación con auditoría

Cada reversión debe registrar: usuario, timestamp, motivo, IP y referencia al movimiento original.
