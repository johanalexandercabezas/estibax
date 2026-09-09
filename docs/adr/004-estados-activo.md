# ADR 004 — Estados Independientes del Activo

**Proyecto:** EstibaX  
**Estado:** Aceptado  
**Fecha:** 2026-08-27

## Contexto

Una estiba/palé puede describirse simultáneamente por su condición física, su estado logístico y su disponibilidad operativa. Mezclar estos estados en una sola columna dificulta las reglas de negocio.

## Decisión

Tres conjuntos de estados separados en la entidad `activo`:

**Estado físico:**

- `BUENO`
- `REGULAR`
- `DAÑADO`
- `CRITICO`

**Estado logístico:**

- `DISPONIBLE`
- `EN_TRANSITO`
- `EN_CLIENTE`
- `EN_REPARACION`
- `PERDIDA`
- `BAJA`

**Estado operativo:**

- `LIBRE`
- `BLOQUEADO`

## Consecuencias

- Las reglas de despacho validan la combinación de estados.
- Un activo `DAÑADO` + `BLOQUEADO` no puede despacharse.
- Una novedad abierta bloquea automáticamente el estado operativo.
- La reparación requiere inspección humana para volver a `BUENO`.

## Transiciones

```text
BUENO → DAÑADO → BLOQUEADO → EN_REPARACION → INSPECCION → BUENO | BAJA
```
