# ADR 003 — Segregación de Propiedad, Custodia y Ubicación

**Proyecto:** EstibaX  
**Estado:** Aceptado  
**Fecha:** 2026-08-27

## Contexto

El Prompt Maestro establece que un activo tiene tres dimensiones independientes:

- **Propiedad:** quién es dueño legal.
- **Custodia:** quién tiene la responsabilidad física actual.
- **Ubicación:** dónde está físicamente.

Esta separación permite consultas complejas como:  
_"¿Cuántas estibas ERCOL están bajo custodia del cliente ABC en la planta X?"_

## Decisión

Modelar cada dimensión como atributos independientes de la entidad `activo`:

```text
activo
  ├── propiedad        (PROPIA | ERCOL | TERCERO)
  ├── custodia_tipo    (EMPRESA | CLIENTE | OTRO)
  ├── custodia_id      → cliente o entidad
  └── ubicacion_id     → zona/bodega/planta/sede
```

## Consecuencias

- Flexibilidad para representar escenarios reales.
- Las consultas se construyen combinando las tres dimensiones.
- Los movimientos del Kardex deben actualizar custodia y ubicación de forma explícita.

## Reglas de negocio

- Un cambio de ubicación no implica cambio de propiedad.
- Un cambio de custodia no implica cambio de propiedad.
- La propiedad solo cambia por compra, nunca por transferencia o uso.
