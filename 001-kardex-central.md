# 001-kardex-central.md

# ADR 001 — Kardex Central Transaccional

**Proyecto:** EstibaX  
**Estado:** Propuesta técnica base  
**Fecha:** 2026-08-26

## 1. Contexto

Una tabla que solamente almacena el inventario actual no explica cómo se obtuvo el saldo. Para lograr trazabilidad profesional, EstibaX necesita conservar los eventos que producen los cambios.

## 2. Decisión

El **Kardex Central** será la fuente operacional de verdad para movimientos confirmados.

Conceptualmente:

```text
Kardex = historial de eventos
Inventario = proyección del estado
Auditoría = evidencia de acciones
```

Los módulos secundarios no deben modificar directamente el historial del Kardex.

## 3. Modelo de saldo

```text
Saldo_final =
Saldo_inicial
+ Entradas
- Salidas
+ Ajustes_positivos
- Ajustes_negativos
```

Para una fecha determinada:

```text
Saldo(T) =
Saldo_inicial +
Σ impacto(eventos confirmados con effective_at <= T)
```

## 4. Dimensiones

El saldo puede depender de:

- organización;
- propietario;
- tipo de activo;
- activo;
- ubicación;
- custodio;
- cliente;
- estado;
- lote.

Ejemplo:

```text
propietario = ERCO
tipo_activo = EUROPEA
ubicación = BODEGA_01
estado = DISPONIBLE
```

Las dimensiones definitivas deben validarse con el proceso real.

## 5. `movement`

Representa la operación empresarial:

```text
id
organization_id
movement_type_id
document_id
effective_at
created_at
status
owner_id
origin_location_id
destination_location_id
created_by
approved_by
confirmed_at
correction_of_id
external_reference
notes
```

## 6. `movement_line`

Permite múltiples líneas:

```text
id
movement_id
asset_type_id
asset_id nullable
quantity
unit
condition
notes
```

## 7. `kardex_entry`

Representa el impacto registrado:

```text
id
organization_id
movement_id
movement_line_id
effective_at
posted_at
owner_id
asset_type_id
asset_id
location_id
custodian_id
quantity_in
quantity_out
balance_after
entry_hash
created_at
```

La estructura definitiva dependerá de si el sistema opera por cantidades, unidades individuales o un modelo híbrido.

## 8. Doble fecha

### `effective_at`
Cuándo ocurrió el hecho logístico.

### `posted_at`
Cuándo se registró/confirmó en el sistema.

Ejemplo:

```text
Hecho físico: 10/08/2026 14:00
Registro:     11/08/2026 09:20
```

Esto permite controlar operaciones retroactivas.

## 9. Tipos de movimiento

Catálogo inicial:

```text
ENTRADA
ENTREGA
SALIDA
RECEPCION
TRASLADO
DEVOLUCION
AJUSTE_POSITIVO
AJUSTE_NEGATIVO
BAJA
PERDIDA
RECUPERACION
PRESTAMO
RETORNO
INVENTARIO_INICIAL
```

Cada tipo debe especificar:

```text
direction
requires_origin
requires_destination
requires_document
requires_approval
allows_negative_balance
requires_evidence
active
```

## 10. Invariantes

### 10.1 No mutación destructiva
Un Kardex confirmado no se modifica para corregirlo.

### 10.2 Trazabilidad
Todo impacto apunta a una operación válida.

### 10.3 Integridad referencial
Las referencias a activos, propietarios y ubicaciones deben existir.

### 10.4 Atomicidad
No puede existir una confirmación parcial.

### 10.5 Idempotencia
La misma operación lógica no puede producir dos impactos.

### 10.6 Auditoría
Las operaciones críticas deben ser reconstruibles.

## 11. Idempotencia

Las confirmaciones deben utilizar un mecanismo equivalente a:

```text
Idempotency-Key
```

Protege contra:

- doble clic;
- timeout;
- reintentos;
- peticiones duplicadas.

## 12. Correcciones

Nunca se debe modificar destructivamente una operación confirmada.

Ejemplo:

```text
Original:   +100
Corrección:  -20
Neto:        +80
```

La corrección debe almacenar:

- movimiento original;
- motivo;
- usuario;
- fecha;
- evidencia cuando aplique;
- aprobación cuando aplique.

## 13. Corrección retroactiva

Ejemplo:

```text
A — 01/08 — +100
B — 05/08 — -20
```

Si el 10/08 se descubre que A debía ser +90:

```text
C — corrige A — -10
```

A permanece intacto.

## 14. Máquina de estados

```text
BORRADOR
   ↓
PENDIENTE_VALIDACION
   ↓
PENDIENTE_APROBACION
   ↓
CONFIRMADO
```

Rutas alternativas:

```text
RECHAZADO
ANULADO_LOGICAMENTE
```

Un confirmado no vuelve a borrador.

## 15. Validaciones

### Documento
- existencia;
- formato;
- duplicidad.

### Cantidad
- positiva;
- unidad correcta.

### Disponibilidad
- saldo suficiente;
- excepción explícitamente autorizada.

### Origen/destino
- existencia;
- coherencia;
- compatibilidad.

### Propietario
- activo;
- autorizado.

### Fecha
- ventana permitida;
- control de retroactividad.

### Usuario
- permisos de registro y confirmación.

### Evidencia
- obligatoriedad según política.

## 16. Flujo técnico

```text
Frontend
   ↓
API / Server Action
   ↓
Autenticación
   ↓
Autorización
   ↓
Validación de esquema
   ↓
Reglas de negocio
   ↓
Transacción DB
   ├── confirmar movement
   ├── insertar kardex_entry
   ├── actualizar proyección
   ├── insertar audit_event
   └── registrar evento/outbox si aplica
   ↓
COMMIT
```

Cualquier fallo debe producir `ROLLBACK`.

## 17. Concurrencia

Ejemplo:

```text
Saldo = 80

A retira 60
B retira 50
```

Dos validaciones independientes podrían leer 80. Por tanto, la disponibilidad debe comprobarse dentro de una estrategia de concurrencia apropiada.

Opciones a evaluar en PostgreSQL:

- row locking;
- transacciones;
- serialización;
- restricciones;
- funciones de base de datos.

La solución definitiva debe validarse con pruebas concurrentes.

## 18. Inventario como proyección

El inventario puede mantenerse para consultas rápidas:

```text
Kardex → eventos
Inventario → proyección
```

La proyección debe poder reconstruirse desde el Kardex.

## 19. Auditoría

Registrar, como mínimo:

```text
actor
timestamp
action
entity
entity_id
request_id
old_state
new_state
reason
contexto técnico cuando corresponda
```

No almacenar secretos en logs.

## 20. Seguridad

El frontend no constituye una barrera de autorización.

Incorrecto:

```text
Ocultar botón "Confirmar"
```

Correcto:

```text
Backend verifica permiso
```

Con Supabase/PostgreSQL deben evaluarse:

- RLS;
- políticas por organización;
- operaciones privilegiadas server-side;
- separación de claves;
- Storage privado.

## 21. Consultas

Debe soportar:

```text
saldo actual
saldo a fecha
movimientos por periodo
movimientos por documento
movimientos por cliente
movimientos por propietario
movimientos por ubicación
correcciones
```

## 22. Pruebas mínimas

1. Entrada 100 → saldo 100.
2. Salida 20 → saldo 80.
3. Salida 90 desde 80 → rechazo.
4. Dos operaciones concurrentes → no superar disponibilidad.
5. Misma idempotency key → no duplicación.
6. Corrección → nuevo evento.
7. Consulta histórica → saldo correcto.
8. Usuario sin permiso → rechazo.
9. Documento duplicado → rechazo.
10. Error transaccional → rollback completo.

## 23. Criterios de aceptación

El Kardex está listo cuando:

- los saldos sean reproducibles;
- no existan ediciones destructivas;
- las correcciones sean trazables;
- exista idempotencia;
- la concurrencia esté controlada;
- la autorización sea server-side;
- la auditoría sea verificable;
- la proyección pueda regenerarse;
- las pruebas críticas estén automatizadas.

## 24. Decisiones abiertas

1. ¿Control individual o por cantidad?
2. ¿Qué significa propietario?
3. ¿Qué significa custodio?
4. ¿Cómo se modela ubicación?
5. ¿Cómo se registra un traslado?
6. ¿Se permiten saldos negativos excepcionales?
7. ¿Qué movimientos requieren aprobación?
8. ¿Qué movimientos pueden ser retroactivos?
9. ¿Cómo se cierran periodos?
10. ¿Qué eventos generan cobro?
11. ¿Cómo se importan históricos?
12. ¿Qué integraciones externas existirán?

## 25. Decisión final

El Kardex Central debe mantenerse como una capacidad de dominio independiente:

```text
Operaciones
     ↓
Motor transaccional
     ↓
Kardex Central
     ├── Inventarios
     ├── Reportes
     ├── Indicadores
     ├── Alertas
     ├── Auditoría
     └── Cobros
```

## 26. Conclusión

El Kardex Central debe responder:

> **“¿Por qué existe exactamente este saldo y qué evidencia permite demostrarlo?”**

Esa capacidad constituye el fundamento técnico de la trazabilidad profesional de EstibaX.
