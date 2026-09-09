# EstibaX — Especificación integral

**Versión:** 1.0  
**Estado:** Base de continuidad para desarrollo, investigación y proceso educativo  
**Fecha:** 2026-08-26

## 1. Propósito

EstibaX es una plataforma empresarial para el control integral de estibas/palés y otros activos logísticos retornables. Esta especificación sirve como contrato funcional, base de arquitectura, guía de desarrollo, referencia de pruebas y marco para la investigación aplicada.

## 2. Problema

El control de estibas mediante Excel, documentos aislados, correos y registros manuales dificulta conocer con precisión:

- cuántos activos existen;
- quién es propietario;
- quién los tiene bajo custodia;
- dónde están;
- qué movimientos realizaron;
- qué documento respalda cada movimiento;
- quién registró, aprobó y confirmó;
- qué correcciones se hicieron;
- cuál era el saldo a una fecha determinada.

EstibaX debe transformar cada operación en un evento verificable, trazable y auditable.

## 3. Visión

EstibaX será un sistema de trazabilidad de activos logísticos retornables.

Modelo conceptual:

**Activo + Propietario + Custodio + Ubicación + Movimiento + Documento + Fecha + Evidencia + Estado + Auditoría**

La plataforma debe poder explicar no solamente **qué saldo existe**, sino **por qué existe ese saldo**.

## 4. Principios de diseño

1. **Trazabilidad primero:** todo cambio de saldo debe poder explicarse.
2. **Kardex como fuente operacional:** el inventario es una consecuencia de movimientos confirmados.
3. **Inmutabilidad:** una operación confirmada no se edita destructivamente.
4. **Corrección auditada:** las correcciones son nuevos eventos relacionados.
5. **Atomicidad:** confirmación y actualización de saldos deben ser una sola transacción.
6. **Idempotencia:** repetir una solicitud no puede duplicar su efecto.
7. **Segregación de funciones:** registrar, aprobar y auditar pueden ser responsabilidades diferentes.
8. **Seguridad por defecto:** autenticación, autorización, mínimo privilegio y auditoría.
9. **UX operacional:** la interfaz debe reducir errores y ser más eficiente que Excel.
10. **Investigación reproducible:** las decisiones deben poder justificarse con evidencia.

## 5. Alcance funcional

### 5.1 Dashboard ejecutivo
Indicadores de saldos, movimientos, diferencias, alertas, pendientes y tendencias.

### 5.2 Operaciones
Registro, validación, aprobación, confirmación y consulta de movimientos.

Flujo de referencia:

1. Tipo y documento
2. Origen y destino
3. Revisión
4. Confirmación

### 5.3 Kardex
Historial transaccional de movimientos confirmados.

### 5.4 Inventarios
Consulta de saldos y conciliación. El inventario debe ser una proyección derivada del Kardex.

### 5.5 Transportes
Vehículos, conductores, transportadores, viajes, rutas y evidencias relacionadas.

### 5.6 Clientes y puntos
Clientes, plantas, bodegas, patios, puntos de entrega y recepción.

### 5.7 Cobros
Eventos comerciales derivados de pérdida, daño, reposición, uso o servicios.

### 5.8 Alertas
Diferencias, saldo insuficiente, documentos duplicados, devoluciones vencidas, movimientos pendientes y anomalías.

### 5.9 Indicadores
Rotación, permanencia, recuperación, pérdida, daño, exactitud y correcciones.

### 5.10 Reportes
Kardex, movimientos, saldos, conciliaciones, auditoría, transportes e indicadores.

### 5.11 Auditoría
Registro de acciones críticas, cambios de estado, aprobaciones y correcciones.

### 5.12 Configuración
Tipos de activos, movimientos, propietarios, ubicaciones, reglas, roles y permisos.

## 6. Modelo conceptual de datos

Entidades principales propuestas:

```text
organization
user
role
permission
asset_type
asset
owner
location
customer
transport
vehicle
driver
movement
movement_line
kardex_entry
document
evidence
approval
audit_event
inventory_snapshot
reconciliation
alert
billing_event
```

La estructura física definitiva debe validarse antes de congelar el esquema.

## 7. Activos

EstibaX debe soportar dos niveles:

### Control por cantidad

Ejemplo:

```text
EUROPEA / 100 unidades
```

### Control unitario

Ejemplo:

```text
EST-000001
```

La arquitectura debe poder convivir con ambos modelos.

## 8. Tipos de movimiento

Como catálogo inicial:

- Entrada
- Entrega
- Salida
- Recepción
- Traslado
- Devolución
- Ajuste positivo
- Ajuste negativo
- Baja
- Pérdida
- Recuperación
- Préstamo
- Retorno
- Inventario inicial

Cada tipo debe definir su impacto sobre saldos y sus requisitos.

## 9. Estados

```text
BORRADOR
PENDIENTE_VALIDACION
PENDIENTE_APROBACION
CONFIRMADO
RECHAZADO
ANULADO_LOGICAMENTE
```

Un movimiento confirmado no vuelve a borrador.

## 10. Reglas de negocio

### 10.1 Documento
Debe existir una regla de unicidad para evitar duplicaciones según tipo y contexto.

### 10.2 Disponibilidad
Una salida no puede superar el saldo disponible, salvo excepción expresamente autorizada y auditada.

### 10.3 Atomicidad
La confirmación debe crear el movimiento, impacto de Kardex, actualización de proyección y auditoría dentro de una transacción.

### 10.4 Inmutabilidad
No se permite editar destructivamente una operación confirmada.

### 10.5 Correcciones
Toda corrección referencia el movimiento original y registra motivo, actor y fecha.

### 10.6 Fecha efectiva
Debe distinguirse el momento del hecho logístico del momento de registro.

### 10.7 Idempotencia
La misma operación lógica no puede producir dos impactos.

### 10.8 Autorización
La seguridad se aplica en backend; ocultar controles en frontend no constituye autorización.

### 10.9 Evidencia
Las operaciones que la política determine deben tener soporte documental antes de confirmar.

## 11. Seguridad

Requisitos mínimos:

- HTTPS;
- autenticación;
- autorización por roles/permisos;
- gestión segura de sesiones;
- secretos fuera de Git;
- variables de entorno;
- validación de entradas;
- protección frente a inyección;
- control y validación de archivos;
- límites de tamaño;
- rate limiting;
- logs sin secretos;
- cifrado en tránsito;
- cifrado en reposo cuando corresponda;
- backups;
- recuperación;
- revisión de dependencias.

Si se utiliza Supabase:

- RLS;
- políticas por organización;
- separación entre claves públicas y secretos;
- operaciones privilegiadas server-side;
- Storage privado cuando corresponda.

## 12. Arquitectura recomendada

### Frontend
React/Next.js, TypeScript, sistema de diseño, accesibilidad y formularios validados.

### Backend
API/server-side con lógica de dominio centralizada, autorización y transacciones.

### Base de datos
PostgreSQL.

### Infraestructura
Hosting administrado, almacenamiento de objetos, CI/CD, observabilidad y backups.

La tecnología definitiva debe reflejar el repositorio real y no esta recomendación.

## 13. UX/UI

La dirección visual es **Enterprise Premium**:

- navegación lateral;
- Bento/Grid;
- modo claro/oscuro;
- tablas operacionales;
- filtros;
- formularios por etapas;
- indicadores;
- estados claros;
- animación mínima.

La prioridad es reducir errores y acelerar tareas repetitivas.

## 14. Requisitos no funcionales

- rendimiento medible;
- consultas paginadas;
- índices justificados;
- escalabilidad;
- mantenibilidad;
- pruebas automatizadas;
- observabilidad;
- recuperación ante fallos;
- trazabilidad completa.

## 15. Investigación aplicada

### Pregunta principal

> ¿En qué medida un sistema digital basado en eventos, validaciones, Kardex transaccional y auditoría mejora la trazabilidad y exactitud del control de estibas frente a un proceso manual?

### Variables independientes

- digitalización;
- validaciones automáticas;
- modelo basado en eventos;
- autorización;
- auditoría.

### Variables dependientes

- exactitud del inventario;
- tiempo de registro;
- tiempo de consulta;
- tiempo de conciliación;
- número de errores;
- número de correcciones;
- tiempo de reconstrucción histórica.

### Hipótesis de trabajo

> La digitalización de los movimientos mediante un Kardex transaccional con validaciones y auditoría reduce inconsistencias y mejora la trazabilidad frente a un registro manual no estructurado.

Debe comprobarse mediante mediciones, no asumirse como resultado.

## 16. Metodología educativa

Cada funcionalidad crítica debe documentarse:

```text
Problema
↓
Pregunta
↓
Hipótesis
↓
Diseño
↓
Implementación
↓
Prueba
↓
Resultado
↓
Limitaciones
↓
Conclusión
```

Esto permite utilizar EstibaX como proyecto aplicado de logística, bases de datos, ingeniería de software, UX, seguridad, analítica y auditoría.

## 17. Criterios de aceptación generales

Una versión candidata a producción debe demostrar:

- autenticación;
- autorización;
- creación de movimiento;
- validaciones;
- aprobación cuando aplique;
- confirmación transaccional;
- Kardex correcto;
- inventario consistente;
- auditoría;
- correcciones auditadas;
- idempotencia;
- pruebas;
- backups;
- observabilidad;
- documentación.

## 18. Pendientes de investigación

Antes de cerrar el modelo empresarial:

- tipos reales de estiba;
- unidades;
- identificación individual;
- definición de propietario;
- definición de custodio;
- ubicaciones;
- procesos de entrega y devolución;
- pérdida y daño;
- documentos;
- aprobación;
- conciliación;
- operaciones retroactivas;
- cierres de periodo;
- importación histórica;
- integraciones ERP/WMS/TMS;
- retención documental.

## 19. Regla maestra

> **Ninguna cifra de inventario debe existir sin poder explicar de dónde provino.**
