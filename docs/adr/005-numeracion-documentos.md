# ADR 005 — Numeración Consecutiva por Tipo de Documento

**Proyecto:** EstibaX  
**Estado:** Aceptado  
**Fecha:** 2026-08-27

## Contexto

El Prompt Maestro exige numeración consecutiva por tipo de documento: `SAL-000001`, `ENT-000001`, `TRA-000001`, `DEV-000001`, `NOV-000001`, `CON-000001`, `AJU-000001`.

## Decisión

Utilizar una tabla de secuencias por empresa y tipo de documento:

```text
secuencia_documento
  ├── empresa_id
  ├── tipo           (SAL | ENT | TRA | DEV | NOV | CON | AJU)
  ├── prefijo
  ├── ultimo_numero
  └── updated_at
```

La generación del número se realiza dentro de una transacción que incluye la creación del movimiento.

## Consecuencias

- Los números nunca se reutilizan, incluso si un movimiento es revertido.
- Cada empresa tiene su propia secuencia aislada.
- El formato es `PREFIJO-NNNNNN` con relleno de ceros.

## Reglas

- La numeración es obligatoria para movimientos confirmados.
- No se permite editar manualmente el número generado.
- Los borradores no consumen número.
