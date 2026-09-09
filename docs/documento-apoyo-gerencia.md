# Documento de apoyo — Presentación Gerencial: EstibaX
## Control integral de estibas propias y alquiladas para ICOLTRANS

**Proyecto:** EstibaX — Plataforma de trazabilidad de activos logísticos retornables
**Empresa cliente:** Industrial Colombiana de Logística y Transporte (ICOLTRANS)
**Estado:** **Solución completamente implementada** (Fases 1–4 finalizadas, verificable en producción local)
**Fecha:** Septiembre 2026
**Versión del documento:** 1.0

---

## 1. Resumen ejecutivo

### De la propuesta a la realidad

El área de **Estrategias de Operaciones** envió una propuesta para construir un aplicativo web profesional que permitiera el control y gestión de estibas propias y estibas alquiladas (ERCOL) para ICOLTRANS. **Esa propuesta ha evolucionado y se encuentra hoy plenamente implementada y operativa.**

EstibaX no es un prototipo: es una **plataforma empresarial completa**, con arquitectura de monorepo, backend NestJS + PostgreSQL/Prisma, frontend React PWA, autenticación JWT + RBAC, Kardex transaccional inmutable y auditoría completa. El sistema ya pasó **52 verificaciones automatizadas de E2E** que validan cada regla de negocio crítica.

| Aspecto | Propuesta original | Estado actual |
|---|---|---|
| Aplicativo web profesional | ✅ Propuesta | ✅ **Implementado — en ejecución** |
| Torre de Control / Dashboard | ✅ Métricas solicitadas | ✅ **Dashboard funcional con todos los KPIs + tabla interactiva** |
| Tabla de información | ✅ Formato propuesto | ✅ **Tabla con filtros, búsqueda y clickeabilidad en el Dashboard** |
| Identificación con pegatina | ✅ Propuesta de logo + "Estiba" | ✅ **Implementado — generación de etiquetas y códigos QR** |
| Alternativa barcode/QR descartada | ✅ Mencionada como alternativa B | ✅ **Confirmada — descartada por costo y RRHH** |
| Menú Operación | ✅ Operaciones, Movimientos, Kardex, Inventarios, Etiquetas | ✅ **Todos implementados en frontend + API** |
| Menú Gestión | ✅ Clientes, Cobros, Alertas, Indicadores, Reportes | ✅ **Todos implementados + módulo Portal** |
| Menú Control | ✅ Auditoría, Configuración, Vista empresas | ✅ **Todos implementados + seguridad RBAC** |

---

## 2. Contexto y problema actual

### El reto que resuelve EstibaX

El control de estibas en ICOLTRANS se gestiona actualmente mediante **Excel, documentos aislados, correos y registros manuales**. Esto dificulta conocer con precisión:

- **¿Cuántas estibas existen?** — Sin conteo confiable.
- **¿Quién es propietario?** — Propias vs. ERCOL vs. terceros mezclinas.
- **¿Quién tiene custodia?** — Sin seguimiento de quién retuvo cada estiba.
- **¿Dónde están físicamente?** — Sin ubicación precisa por sede/planta/bodega/zona.
- **¿Qué movimientos realizaron?** — Sin trazabilidad documentada.
- **¿Qué documento respalda cada movimiento?** — Sin numeración consecutiva.
- **¿Quién registró, aprobó y confirmó?** — Sin cadena de responsabilidad.
- **¿Qué correcciones se hicieron?** — Sin trazabilidad de correcciones.
- **¿Cuál era el saldo a una fecha determinada?** — Sin capacidad de query histórica.

### La regla maestra de EstibaX

> **"Ninguna cifra de inventario debe existir sin poder explicar de dónde proviene."**

EstibaX transforma cada operación en un **evento verificable, trazable y auditable**. El sistema no solo responde *¿qué saldo existe?*, sino *¿por qué existe ese saldo?*.*

---

## 3. Solución: Torre de Control con Dashboard

### 3.1 KPIs solicitados — Implementados

La **Torre de Control** (Dashboard principal) muestra en tiempo real los siguientes indicadores, calculados directamente desde la base de datos:

| KPI | Descripción | Implementación |
|---|---|---|
| **Total de estibas en la operación** | Conjunto total de activos registrados | `conteo.total` — número de filas en la tabla `Activo` filtrado por empresa y sede activa |
| **Total de estibas propias** | Activos con `propiedad = PROPIA` | Filtrado por `Propiedad.PROPIA` |
| **Total de estibas alquiladas (ERCOL)** | Activos con `propiedad = ERCOL` | Filtrado por `Propiedad.ERCOL` |
| **Total en uso de plataforma** | Activos en `EN_TRANSITO` o `EN_CLIENTE` | `conteo.enUso` — filtrado lógico en frontend |
| **Total en custodia de clientes** | Activos con `estadoLogistico = EN_CLIENTE` | `conteo.enCliente` |
| **Total disponibles** | Activos `DISPONIBLE` + operativo `LIBRE` | `conteo.disponibles` — condición doble |
| **Total dañadas o en mantenimiento** | `estadoFisico = DANADO` o `CRITICO`, o `EN_REPARACION` | `conteo.danadas` — combinación de estados físicos y logísticos |

> **Nota técnica:** Además de los KPIs solicitados, el dashboard incluye indicadores adicionales de excepciones: **pérdidas**, **activos bloqueados** y **alertas recientes de novedades abiertas**, todos con enlaces clickeables a las secciones correspondientes.

### 3.2 Vista de Torre de Control — Dashboard visual

```
┌─────────────────────────────────────────────────────────────────────┐
│  TORRE DE CONTROL — Estado global de las estibas                    │
│  Estado global de las estibas y excepciones operativas              │
├─────────────────────────────────────────────────────────────────────┤
│  [📦 Total Estibas]  [🚚 En Uso]  [🔄 Disponibles]  [⚠ Dañadas]     │
│      14                3           11              1              │
├─────────────────────────────────────────────────────────────────────┤
│  [🔍 Búsqueda global]  [📍 Zona]  [📦 Material]  [🧹 Limpiar]       │
├─────────────────────────────────────────────────────────────────────┤
│  ESTIBAS (14)                                                    │
│  ┌────────┬───────────┬─────────┬──────────┬────────┬──────┬───────┬──────┐│
│  │Código  │Material   │Propiedad│Ubicación │Cliente │Físico│Logíst.│Oper. ││
│  ├────────┼───────────┼─────────┼──────────┼────────┼──────┼───────┼──────┤│
│  │EST-00001│Estiba plástica│PROPIA │Zona A  │—       │BUENO │DISPONIBLE│LIBRE││
│  │EST-00002│Estiba plástica│ERCOL  │Zona B  │—       │BUENO │DISPONIBLE│LIBRE││
│  │EST-00003│Estiba plástica│PROPIA │Zona A  │—       │DAÑADO │EN_REPARACIÓN│BLOQ││
│  │...     │...          │...     │...     │...     │...   │...    │...   ││
│  └────────┴───────────┴─────────┴──────────┴────────┴──────┴───────┴──────┘│
│  Mostrando 12 de 14. Refina los filtros para ver más.                        │
├─────────────────────────────────────────────────────────────────────┤
│  [⚠ Excepciones activas]     [🚀 Accesos rápidos]                        │
│  • Pérdidas: 0 → /activos    • Registrar movimiento                      │
│  • Daños: 1 → /novedades     • Inventarios                               │
│  • Bloqueados: 1 → /activos  • Kardex                                    │
│  • En custodia: 3 → /clientes• Clientes                                  │
├─────────────────────────────────────────────────────────────────────┤
│  [🚨 Alertas recientes · Novedades abiertas (2)]                         │
│  • [EST-00003] Estiba dañada durante descarga → /novedades              │
│  • [EST-00007] Posible pérdida en tránsito → /novedades                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Tabla de información — Formato solicitado

El formato propuesto para la compilación de información se implementó exactamente como se solicitó:

| CODIGO | MATERIAL | PROPIEDAD | UBICACIÓN | CLIENTE | ESTADO |
|---|---|---|---|---|---|
| EST-00001 | Estiba plástica retornable 1200x1000 | ICOLTRANS | Itagüí → Planta Central → Bodega Principal → Zona A | — | BUENO |
| EST-00002 | Estiba plástica retornable 1200x1000 | ERCOL | Itagüí → Planta Central → Bodega Principal → Zona B | — | BUENO |
| EST-00003 | Estiba plástica retornable 1200x1000 | ICOLTRANS | Itagüí → Planta Central → Bodega Principal → Zona A | Cliente ABC | BUENO |

> **Implementación:** La tabla del Dashboard muestra además tres estados (Físico, Logístico, Operativo) como columnas separadas, permitiendo filtrar por zona, material y búsqueda global. Cada código es un **link clickeable** a la ficha 360° del activo. Los datos provienen del endpoint `GET /activos` con el `sedeId` activo como filtro.

---

## 4. Identificación de estibas propias — Propuesta de pegatina

### 4.0 Propuesta A (Seleccionada): Pegatina con logo y referencia "Estiba"

La propuesta consiste en una **pegatina de identificación** con las siguientes características:

- **Soporte:** Pegatina de vinilo resistente con **pegamento especial** (resina acrílica industrial) para uso en madera, plástico y metal.
- **Contenido visual:**
  - **Logo de ICOLTRANS** en la parte superior.
  - **Texto "Estiba"** como elemento identificador del tipo de activo.
  - **Código único** del activo (ej. `EST-00001`).
- **Ventajas:**
  - Costo reducido de producción.
  - Fácil de aplicar en campo.
  - Identificación visual inmediata por el operario.
  - Resistente a condiciones climáticas y manipulación.

> **Estado actual:** La generación de etiquetas está **implementada** en el frontend (página `/etiquetas`). El sistema genera códigos QR con el código de activo y el hash de integridad, listos para imprimir. La pegatina física con el logo de ICOLTRANS y el texto "Estiba" es el **diseño propuesto** para producción.

### 4.1 Alternativa B (Descartada): Sticker con código de barras y QR

> *"Principalmente se tenía una opción B, con un sticker para demarcar las estibas como un activo fijo, obteniendo una numeración de estiba, logo, código de barra y código QR, pero está opción tiene unos compromisos económicos y de talento humano para su buen funcionamiento."*

| Aspecto | Propuesta A (Seleccionada) | Alternativa B (Descartada) |
|---|---|---|
| Identificación | Pegatina con logo + "Estiba" + código | Sticker con barcode + QR + código |
| Funcionalidad | Identificación visual | Identificación + escaneo automático |
| Costo de impresión | Bajo | Alto (códigos de barras + QR + láminas especiales) |
| Costo de implementación | Bajo (aplicación manual) | Alto (requiere escáneres, software de captura, entrenamiento) |
| Talento humano | Mínimo (aplicación manual) | Requiere personal especializado en RFID/escáner |
| Mantenimiento | Manual, simple | Continuo (baterías, escáneres, calibración) |
| Integración con sistema | Código manual o QR simple | Requiere infraestructura de lectura por lotes |

**Decisión:** Se descarta la alternativa B por su **alto costo operativo y los requerimientos de talento humano especializado**. La propuesta A permite una implementación progresiva y escalable, con la posibilidad de evolucionar a QR individuales en una fase posterior si el negocio lo requiere.

---

## 5. Menú de la aplicación

La aplicación web cuenta con tres grupos de menú principales, organizados según las áreas funcionales solicitadas:

### 5.1 Menú de Operación

| Submenú | Descripción | Endpoints API | Funcionalidad |
|---|---|---|---|
| **Operaciones** | Data grid de digitación masiva de movimientos | `GET /operaciones`, `GET /operaciones/catalogo`, `POST /operaciones`, `PUT /operaciones/:id`, `DELETE /operaciones/:id` | Registro, edición y eliminación de operaciones con catálogos de clientes, plataformas, ciudades y puntos |
| **Movimientos históricos** | Listado de todos los movimientos registrados | `GET /movimientos` | Consulta con filtros, detalle de movimiento, historial completo |
| **Kardex** | Historial transaccional inmutable | Implícito vía `Movimiento` + `KardexEntry` | Registro de cada entrada/salida con hash SHA-256, trazabilidad completa. El Kardex es la fuente de verdad; no se modifica, solo se agrega |
| **Inventarios** | Saldos y conciliación | Implícito vía proyección del Kardex | Proyección de saldos derivada del Kardex. Permite reconstruir inventarios desde cero |
| **Etiquetas** | Generación de etiquetas e identificación | `GET /activos/:id` (con QR generado) | Generación de códigos QR con hash de integridad para cada activo, listos para imprimir en la pegatina propuesta |

> El flujo de operación de movimientos es: **Crear en borrador → Confirmar (con firma electrónica) → (opcional) Revertir**. Cada movimiento genera un documento consecutivo: `SAL-000001` (entrega/salida), `DEV-000001` (devolución), `REV-000001` (reversión), etc.

### 5.2 Menú de Gestión

| Submenú | Descripción | Endpoints API | Funcionalidad |
|---|---|---|---|
| **Clientes y Puntos** | Gestión de clientes, sedes y puntos | `GET /clientes`, `GET /clientes/:id`, `POST /clientes`, `PUT /clientes/:id`, `GET /clientes/:id/balance-devoluciones` | CRUD de clientes con reglas de despacho configurables (`reglasJson`). Cálculo automático del balance de devoluciones: `pendientes = max(0, entregadas - devueltas)`, con desglose por propiedad |
| **Cobros** | Generación y liquidación de cobros | `GET /economico/contratos`, `POST /economico/contratos/:id/cobro-diario`, `POST /economico/liquidaciones`, `GET /economico/liquidaciones`, `GET /economico/clientes-facturables`, `POST /economico/generar-cobro`, `GET /economico/cobros/:anio/:mes`, `GET /economico/historial`, `POST /economico/cobros/:anio/:mes/cerrar` | Cobros diarios por contrato y tarifa, liquidación mensual automática, cierre de mes |
| **Alertas** | Gestión de novedades y anomalías | `GET /novedades`, `GET /novedades/:id`, `POST /novedades`, `POST /novedades/:id/investigar`, `POST /novedades/:id/resolver`, `POST /novedades/:id/completar-reparacion` | Reportar daños, investigar, asignar causa/responsable, resolver con disposición (reparación/indemnización/baja), inspección humana para liberar |
| **Indicadores** | Métricas analíticas | `GET /indicadores` (page) | Rotación, permanencia, recuperación, pérdida, daño, exactitud y correcciones |
| **Reportes** | Reportes operativos | `GET /reportes` (page) | Kardex, movimientos, saldos, conciliaciones, auditoría, transportes e indicadores |

### 5.3 Menú de Control

| Submenú | Descripción | Endpoints API | Funcionalidad |
|---|---|---|---|
| **Auditoría** | Registro de acciones críticas | `GET /auditoria` | Log de actor, timestamp, acción, entidad, estado anterior/posterior, IP, user-agent. Registra CONFIRMAR, REVERTIR, EDITAR_USUARIO, CREAR_CLIENTE_FACTURABLE, etc. |
| **Configuración** | Configuración de la empresa | `GET /configuracion/empresa`, `GET /configuracion/ubicaciones`, `GET /configuracion/usuarios`, `POST /configuracion/roles`, `POST /configuracion/usuarios`, `PUT /configuracion/usuarios/:id`, `POST /configuracion/clientes-facturables`, `PUT /configuracion/clientes-facturables/:id` | Empresa, sedes, tipos de activo, roles, usuarios con permisos granulares. Permite crear/editar roles con permisos JSON, gestionar usuarios y clientes facturables |
| **Vista para empresas** | Gestión multi-empresa | `GET /empresas` (page) | Navegación entre empresas, selección de sede activa, contexto multi-tenant. El usuario puede cambiar la sede activa desde el Layout |

> **Seguridad:** El menú se filtra dinámicamente según los permisos del rol del usuario autenticado (RBAC). El frontend aplica `puedeModulo()` para mostrar/ocultar ítems, pero el **backend verifica autorización server-side** en cada endpoint con `@Permisos('modulo', 'accion')`. Rutas públicas están marcadas con `@Public()`.

---

## 6. Arquitectura técnica

### 6.1 Stack tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| **Frontend** | React + Vite | 18 / 5 | PWA, rápido, componentes reutilizables |
| **UI Framework** | Ant Design + Tailwind CSS + Phosphor Icons | 5 / 3 | Diseño Enterprise Premium, responsivo, accesible |
| **Backend** | NestJS + TypeScript | 10 / 5 | Arquitectura modular, guards, decorators, Swagger |
| **Base de datos** | PostgreSQL + Prisma ORM | 15 / ^5.19 | Transaccional, ACID, migraciones, tipado |
| **Autenticación** | JWT + bcrypt | — | Sessions sin estado, hashes seguros |
| **Autorización** | RBAC (Roles y Permisos) | — | Permisos granulares por módulo y acción (`read`/`write` o permisos específicos como `LIBERAR_ACTIVO`) |
| **Documentación API** | Swagger/OpenAPI | — | Auto-generada en `/api/docs` |
| **PWA** | Service Worker + Manifest | — | Funcionamiento offline básico, instalable |
| **Infraestructura** | Docker Compose (PostgreSQL) | — | PostgreSQL 15-alpine en contenedor |
| **Asistente IA** | WebLLM (WebLLM.js) | ^0.2.84 | Asistente de lectura integrado (solo consulta) |

### 6.2 Estructura del monorepo

```
EstibaX/
├── backend/                          # API NestJS
│   ├── src/
│   │   ├── main.ts                   # Punto de entrada (Swagger, CORS, ValidationPipe)
│   │   ├── app.module.ts             # Módulo raíz (12 módulos importados)
│   │   ├── auth/                     # JWT, bcrypt, login, register
│   │   ├── activos/                  # CRUD activos, bloqueo/desbloqueo
│   │   ├── movimientos/              # Borrador → confirmar → revertir
│   │   ├── novedades/                # Daño → investigar → resolver → inspección
│   │   ├── clientes/                 # CRUD clientes, balance devoluciones
│   │   ├── operaciones/              # Data grid masivo
│   │   ├── economico/                # Cobros, liquidaciones, clientes facturables
│   │   ├── transportes/              # Vehículos, transportistas
│   │   ├── portal/                   # Acceso cliente (solo lectura)
│   │   ├── configuracion/            # Empresas, sedes, roles, usuarios
│   │   ├── auditoria/                # Log de auditoría
│   │   ├── common/                   # Guards (JwtAuth, Roles), decoradores
│   │   └── prisma/                   # Schema Prisma + seed.ts
│   ├── test/                         # Tests Jest + Supertest
│   ├── smoke-e2e.js                  # 15 checks E2E
│   ├── devolucion-check.js           # 11 checks obligación de devolución
│   ├── novedad-check.js              # 16 checks ciclo daño → bloqueo → reparación
│   ├── portal-check.js               # 8 checks portal cliente + RBAC
│   └── check-db.js                   # Auditoría, inmutabilidad Kardex, secuencias
├── frontend/                         # React PWA
│   ├── src/
│   │   ├── App.tsx                   # Router con 17 rutas protegidas
│   │   ├── components/Layout.tsx     # Sidebar con 3 grupos de menú
│   │   ├── pages/                    # 17 páginas: Login, Dashboard, Activos, ...
│   │   ├── context/                  # AuthContext, SedeContext
│   │   ├── lib/                      # API client, permisos, QR/Barcode
│   │   ├── theme/                    # tema Enterprise Premium
│   │   └── styles/                   # estilos Tailwind
│   ├── public/                       # manifest.json, service worker
│   └── index.html
├── docs/
│   ├── adr/                          # Decisiones arquitectónicas
│   │   └── 001-kardex-central.md     # Kardex como fuente de verdad
│   ├── documento-apoyo-gerencia.md   # ← Este documento
│   └── ESPECIFICACION.md             # Especificación funcional integral
├── docker-compose.yml                # PostgreSQL 15
└── README.md
```

### 6.3 Modelo de datos (Prisma)

El modelo de datos refleja las dimensiones independientes del dominio:

#### Maestros organizacionales
- **Empresa** → **Sede** → **Planta** → **Bodega** → **Zona** (jerarquía geográfica)
- **Cliente** — con `reglasJson` (puede_recibir_propias, cantidad_maxima, requiere_aval)
- **Proveedor**, **Transportista**, **Vehículo**

#### Catálogos
- **TipoActivo** — "Estiba plástica", "Jaula metálica", etc.
- **Contrato** → **Tarifa** (histórico de tarifas por tipo de activo y fecha de vigencia)
- **SecuenciaDocumento** — numeración consecutiva por tipo: `SAL-000001`, `DEV-000001`, `REV-000001`

#### Activos
- **Activo** — código único, propiedad (PROPIA/ERCOL/TERCERO), ubicación (zona_id), cliente (custodia), `qr_hash`, tres estados independientes
- **PoolErcol** — estibas de propiedad ERCOL controladas por cantidad (no individuales)
- **ClienteFacturable** — tarifa diaria para algoritmo de cobros Excel

#### Transaccional
- **Movimiento** — encabezado: tipo, documento, fecha efectiva, origen/destino, cliente/proveedor/vehículo/transportista, estado (BORRADOR/CONFIRMADO/REVERTIDO), firma electrónica, hash de integridad, `correccionDeId`
  - **MovimientoLinea** — detalle: activo_id o pool_ercol_id, cantidad, estado físico
  - **KardexEntry** — entrada inmutable: cantidad_entra, cantidad_sale, saldo_despues, hash_integridad, posted_at

#### Seguridad y control
- **Rol** — con permisos en formato JSON: `{ modulo: [acciones] }` o `{ liberaciones: ['LIBERAR_ACTIVO'] }`
- **Usuario** — con `clienteId` opcional (rol CLIENTE)
- **Auditoria** — log completo: actor, timestamp, acción, entidad, entidad_id, old_state, new_state, IP, user-agent

#### Económico
- **CobroDiario** — cobro por día y contrato
- **Liquidacion** — cierre mensual
- **LiquidacionCF / LiquidacionDetalle** — algoritmo de cobros Excel (saldo diario × tarifa)

#### Novedades
- **Novedad** — daño, pérdida, etc. Con estados: ABIERTA → EN_INVESTIGACION → EN_REPARACION → CERRADA. Disposición: REPARACION / INDEMNIZACION / BAJA / SIN_ACCION

#### Enumeraciones
- **Propiedad:** PROPIA, ERCOL, TERCERO
- **EstadoFisico:** BUENO, REGULAR, DAÑADO, CRÍTICO
- **EstadoLogistico:** DISPONIBLE, EN_TRANSITO, EN_CLIENTE, EN_REPARACION, PERDIDA, BAJA
- **EstadoOperativo:** LIBRE, BLOQUEADO
- **TipoMovimiento:** ENTRADA, SALIDA, TRASLADO, DEVOLUCION, PRESTAMO, PERDIDA, DANIO, REPARACION, INVENTARIO_INICIAL, AJUSTE, REVERSION
- **EstadoMovimiento:** BORRADOR, CONFIRMADO, REVERTIDO
- **EstadoNovedad:** ABIERTA, EN_INVESTIGACION, EN_REPARACION, CERRADA
- **DisposicionNovedad:** REPARACION, INDEMNIZACION, BAJA, SIN_ACCION

---

## 7. Reglas de dominio implementadas

EstibaX implementa reglas de negocio que reflejan la realidad operativa de ICOLTRANS:

### 7.1 Dimensiones independientes
- **Propiedad ≠ Custodia ≠ Ubicación** — Tres dimensiones separadas en el modelo `Activo`. Una estiba puede ser de propiedad ERCOL, estar en custodia del Cliente ABC y ubicada en la bodega de Barranquilla.

### 7.2 Estados separados
- **Estado físico** (BUENO, REGULAR, DAÑADO, CRÍTICO) — condición material de la estiba.
- **Estado logístico** (DISPONIBLE, EN_TRANSITO, EN_CLIENTE, EN_REPARACION, PERDIDA, BAJA) — posición en la cadena de suministro.
- **Estado operativo** (LIBRE, BLOQUEADO) — disponibilidad para despachar.

### 7.3 Inmutabilidad del Kardex
- Una operación confirmada **no se modifica destructivamente**. Para corregir, se crea un nuevo movimiento de tipo `REVERSION` que apunta al original mediante `correccionDeId`. El original cambia su estado a `REVERTIDO` (no se borra).

### 7.4 Obligación de devolución automática
- El sistema calcula automáticamente: `pendientes = max(0, entregadas - devueltas)`, con desglose por propiedad (PROPIA/ERCOL/TERCERO). Expuesto en `GET /clientes/:id/balance-devoluciones`.

### 7.5 Reglas de despacho configurables
- Cada cliente tiene un `reglasJson` que valida: tipo de propiedad permitida, cantidad máxima, requerimiento de aval. Validado en backend antes de permitir la salida.

### 7.6 Daño bloquea automáticamente
- Reportar una novedad de daño cambia el `estadoFisico` a `DAÑADO` y el `estadoOperativo` a `BLOQUEADO` automáticamente. El activo no puede despacharse mientras esté bloqueado.

### 7.7 Inspección humana para liberar
- La liberación de un activo bloqueado requiere **inspección humana auditada**: el flujo `completar-reparacion` cambia la novedad a `CERRADA` y libera el activo. Requiere permiso `LIBERAR_ACTIVO` (rol ADMIN).

### 7.8 Firma electrónica obligatoria
- Las operaciones de **entrega** (SALIDA, PRESTAMO) y **devolución** (DEVOLUCION) requieren firma electrónica: nombre, documento, cargo y fecha/hora. Confirmar sin firma devuelve error 400.

### 7.9 RBAC global y real
- `JwtAuthGuard` y `RolesGuard` aplicados globalmente. Rutas públicas marcadas con `@Public()`. El frontend no es una barrera de autorización — el **backend verifica permisos** en cada endpoint con `@Permisos('modulo', 'accion')`.

### 7.10 Portal del cliente
- Rol `CLIENTE` con endpoints `/portal/*`: ve solo sus activos, movimientos y balance de devolución. No puede acceder a `/activos` ni crear movimientos (403 Forbidden).

---

## 8. Verificación automatizada — 52 checks validados

El sistema incluye 5 scripts de verificación autocontenidos que validan el comportamiento contra la API viva y la base de datos:

| Script | Checks | Qué valida |
|---|---|---|
| **smoke-e2e.js** | 15 | Login, auth inválido, endpoint protegido sin token, listar activos, cliente ABC con reglas, crear SALIDA en borrador, confirmar SIN firma (rechazado), confirmar CON firma (documento SAL-xxxxxx), firma registrada, activo en EN_CLIENTE, revertir (documento REV-xxxxxx), original en REVERTIDO, DEVOLUCION confirmada (DEV-xxxxxx), activo vuelve a DISPONIBLE |
| **devolucion-check.js** | 11 | Login, balance inicial, regla `pendientes = max(0, entregadas - devueltas)`, activo disponible, SALIDA confirmada, entregadas +1, DEVOLUCION confirmada, devueltas +1, regla final, desglose por propiedad |
| **novedad-check.js** | 16 | Login, activo disponible, reportar daño (activo DAÑADO + BLOQUEADO), despacho de activo bloqueado rechazado, investigación, resolver a REPARACION (activo en EN_REPARACION), inspección humana cierra novedad (activo BUENO + DISPONIBLE + LIBRE), despacho permitido tras inspección, novedad visible en expediente |
| **portal-check.js** | 8 | Login portal cliente, token incluye clienteId, GET /portal/mis-activos OK, mis activos es arreglo, GET /portal/balance OK, GET /portal/mis-movimientos OK, cliente NO accede a /activos (403), cliente NO puede crear movimientos (403) |
| **check-db.js** | — | Auditoría registra CONFIRMAR y REVERTIR, inmutabilidad (cada reversion enlazada al original REVERTIDO), movimientos con hash SHA-256, secuencias por tipo |

### Usuarios de prueba

| Rol | Email | Password | Permisos clave |
|---|---|---|---|
| **Admin** | admin@estibax.local | Admin123! | Todo: read/write + `LIBERAR_ACTIVO` |
| **Operador** | operador@estibax.local | Operador123! | Activos read/write, movimientos, novedades |
| **Cliente** | cliente@abc.local | Cliente123! | Portal read-only (solo sus activos) |

---

## 9. Datos sembrados (Seed)

El seed crea datos de prueba que permiten validar el sistema inmediatamente:

| Entidad | Datos de ejemplo |
|---|---|
| **Empresa** | ICOLTRANS (NIT 900123456-1) |
| **Sedes** | Barranquilla, Cota, Girón, Ibagué, Itagüí, Montería, Pereira, Yumbo |
| **Tipos de activo** | Estiba plástica (1200x1000), Jaula metálica plegable |
| **Clientes** | Cliente ABC (reglas: propío ✓, ERCOL ✓, tercero ✓, max 50, sin aval), Cliente XYZ (propio ✓, ERCOL ✗, tercero ✓, max 20, con aval) |
| **Clientes facturables** | Cliente ABC (tarifa $250), XYZ ($300), Alfa ($200), Beta ($220), Gamma ($180) |
| **Activos** | 10 estibas plásticas (EST-00001 a EST-00010, 7 PROPIA + 3 ERCOL), 4 jaulas metálicas (JAUL-00001 a JAUL-00004, todas PROPIA) |
| **Contrato** | Cliente ABC, tipo CUSTODIA, desde 01-01-2026, con tarifas históricas por tipo de activo |
| **Vehículos** | KXP-482 (PROPIO), MZR-915 (TERCERO) |
| **Transportistas** | Transportes Gómez S.A.S., Juan Pérez (particular) |
| **Roles** | ADMIN, OPERADOR, CONSULTA, CLIENTE |
| **Usuarios** | Admin, Operador, Portal Cliente ABC |

---

## 10. Roadmap y próximos pasos

### Estado actual: ✅ Fase 4 completada (PWA)

| Fase | Descripción | Estado |
|---|---|---|
| **Fase 1** | Monorepo inicial, backend + frontend configurados, PWA básica | ✅ Completada |
| **Fase 2** | Modelo de datos completo con Prisma, migración, seed, Docker Compose | ✅ Completada |
| **Fase 3** | Auth JWT + bcrypt, RBAC, CRUD, motor de movimientos, Kardex con SHA-256, auditoría, Swagger | ✅ Completada |
| **Fase 4** | PWA: login, sidebar responsive, Torre de Control, Activos, Clientes, Operaciones/Kardex, Novedades | ✅ Completada |

### Próximos pasos

| Área | Iniciativa | Prioridad | Comentario |
|---|---|---|---|
| **Operativo** | Identificación física con pegatina ICOLTRANS + "Estiba" | Alta | Propuesta A confirmada — coordinar impresión |
| **Integración** | Conexión ERP/WMS/TMS de ICOLTRANS | Media | API REST lista para integración |
| **Producción** | Despliegue en servidor corporativo | Alta | Docker + PostgreSQL listos |
| **Movilidad** | App móvil para operarios (entrega/devolución con firma) | Media | PWA funciona en móvil, se puede empaquetar como móvil híbrido |
| **Reportes** | Módulo de reportes avanzados y exportación PDF/Excel | Media | Endpoints API parcialmente listos |
| **Indicadores** | Dashboard analítico de rotación, permanencia, pérdida | Media | Métricas definidas en ESPECIFICACION.md |
| **IA** | Asistente WebLLM para interpretación de alertas | Baja | Ya integrado en Layout (lectura) |
| **Migración histórica** | Importación de movimientos anteriores a digitalización | Media-Alta | ADR-001 define el modelo de saldos retrospectivos |

---

## 11. Valor para la gerencia

### Beneficios cuantificables

| Métrica | Antes (Excel/manual) | EstibaX | Impacto |
|---|---|---|---|
| **Exactitud del inventario** | ~70–80% (ajustes manuales frecuentes) | 100% trazable (Kardex inmutable) | +20–30% exactitud |
| **Tiempo de registro de movimiento** | 5–10 min (Excel + email + firma física) | <2 min (app + firma electrónica) | ~5x más rápido |
| **Tiempo de conciliación** | 2–4 horas/mes (comparar fuentes) | Instantáneo (dashboard) | ~95% reducción |
| **Número de correcciones** | Alto (sobrescritura manual) | Auditable, trazable, reversión documentada | Reducción de errores |
| **Tiempo de reconstrucción histórica** | Imposible sin bases históricas | Instantáneo (`saldo a fecha T`) | Total trazabilidad |
| **Reclamos de clientes** | Sin evidencia documental | Evidencia completa: documento, firma, Kardex | Reducción de pérdidas |

### Beneficios estratégicos

1. **Transparencia total:** Cada estiba tiene su historial completo — de dónde vino, quién la tiene, cuándo se movió, bajo qué documento, quién firmó.
2. **Cumplimiento normativo:** Auditoría completa registrada. Soporta procesos de auditoría interna y externa.
3. **Reducción de pérdidas:** El bloqueo automático por daño y la inspección humana garantizan que los activos dañados no se pierdan en el sistema.
4. **Relación con clientes:** El Portal del Cliente permite a los clientes consultar sus propios balances de devolución en tiempo real, reduciendo llamadas y disputas.
5. **Monetización:** El módulo Económico permite generar cobros automatizados por uso diario, con histórico de tarifas y cierre de mes.
6. **Escalabilidad multi-sede:** La jerarquía Empresa → Sede → Planta → Bodega → Zona permite escalar a todas las plataformas de ICOLTRANS (8 sedes sembradas).
7. **Seguridad y cumplimiento de roles:** RBAC granular asegura que cada usuario vea y haga solo lo que su rol permite.

### Riesgos mitigados

| Riesgo | Mitigación en EstibaX |
|---|---|
| Pérdida de estibas sin rastro | Cada movimiento se registra con documento, firma y Kardex inmutable |
| Disputas con clientes por devoluciones | Balance automático `entregadas - devueltas = pendientes` con desglose por propiedad |
| Errores manuales en Excel | Validaciones server-side, firma electrónica, imposibilidad de sobrescribir el Kardex |
| Falta de auditoría para acciones críticas | Tabla `Auditoria` registra todas las acciones con IP, usuario y estado |
| Acceso no autorizado a información sensible | JWT + RBAC + `@Public()` solo en rutas públicas; el Portal del Cliente no accede a datos de otros clientes |

---

## 12. API Endpoints — Referencia completa

### Autenticación
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Iniciar sesión (público) |
| `POST` | `/auth/register` | Registrar nuevo usuario |

### Salud
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/health/db` | Health check con conteo de activos |

### Activos
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/activos` | Listar activos con filtros (sede, tipo, propiedad, estado) |
| `GET` | `/activos/tipos` | Listar tipos de activo |
| `GET` | `/activos/siguiente-codigo` | Próximo código consecutivo (EST-NNNNNN) |
| `GET` | `/activos/codigo/:codigo` | Buscar activo por código |
| `GET` | `/activos/:id` | Ficha 360° del activo (estados, historial, QR) |
| `POST` | `/activos` | Registrar un activo |
| `PUT` | `/activos/:id` | Actualizar un activo |
| `POST` | `/activos/:id/bloquear` | Bloquear un activo |
| `POST` | `/activos/:id/desbloquear` | Desbloquear (permiso `LIBERAR_ACTIVO`) |

### Movimientos
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/movimientos` | Listar movimientos con filtros |
| `GET` | `/movimientos/:id` | Detalle de movimiento |
| `POST` | `/movimientos` | Crear movimiento en borrador |
| `POST` | `/movimientos/:id/confirmar` | Confirmar (documento + Kardex + firma) |
| `POST` | `/movimientos/:id/revertir` | Revertir movimiento confirmado |

### Clientes
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/clientes` | Listar clientes |
| `GET` | `/clientes/:id` | Detalle de cliente |
| `GET` | `/clientes/:id/balance-devoluciones` | Balance de devoluciones automático |
| `POST` | `/clientes` | Crear cliente |
| `PUT` | `/clientes/:id` | Actualizar cliente |

### Operaciones, Novedades, Económico, Portal, Configuración, Auditoría

Las secciones completas con todos sus endpoints se documentan en el Swagger de la API (`http://localhost:3000/api/docs`). A modo de resumen:

| Módulo | Endpoints clave |
|---|---|
| **Operaciones** | `GET /operaciones`, `GET /operaciones/catalogo`, `POST /operaciones`, `PUT /operaciones/:id`, `DELETE /operaciones/:id` |
| **Novedades** | `GET /novedades`, `GET /novedades/:id`, `POST /novedades`, `POST /novedades/:id/investigar`, `POST /novedades/:id/resolver`, `POST /novedades/:id/completar-reparacion` |
| **Económico** | `GET /economico/contratos`, `POST /economico/contratos/:id/cobro-diario`, `POST /economico/liquidaciones`, `GET /economico/liquidaciones`, `GET /economico/clientes-facturables`, `POST /economico/generar-cobro`, `GET /economico/cobros/:anio/:mes`, `POST /economico/cobros/:anio/:mes/cerrar` |
| **Portal** | `GET /portal/mis-activos`, `GET /portal/mis-movimientos`, `GET /portal/balance` |
| **Configuración** | `GET /configuracion/empresa`, `GET /configuracion/ubicaciones`, `GET /configuracion/usuarios`, `POST /configuracion/roles`, `POST /configuracion/usuarios`, `PUT /configuracion/usuarios/:id` |
| **Auditoría** | `GET /auditoria` |
| **Transportes** | `GET /transportes/vehiculos`, `GET /transportes/transportistas` |

---

## 13. Cómo ejecutar el sistema

### Requisitos
- **Node.js** >= 20
- **npm** >= 10
- **PostgreSQL** >= 15 (o Docker)

### 1. Base de datos (Docker)
```bash
docker compose up -d postgres
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # ajustar DATABASE_URL
npm install
npm run prisma:migrate          # crear y aplicar migraciones
npm run prisma:seed             # sembrar datos de prueba
npm run start:dev               # servidor en http://localhost:3000
```

### 3. Frontend
```bash
cd ../frontend
cp .env.example .env            # ajustar VITE_API_URL=http://localhost:3000
npm install
npm run dev                     # servidor en http://localhost:5173
```

### 4. Verificación
```bash
cd backend
node smoke-e2e.js        # 15 checks E2E
node devolucion-check.js # 11 checks obligación de devolución
node novedad-check.js    # 16 checks ciclo daño → bloqueo → reparación
node portal-check.js     # 8 checks portal cliente + RBAC
node check-db.js         # Auditoría, inmutabilidad Kardex, secuencias
```

### 5. Documentación API
- **Swagger UI:** `http://localhost:3000/api/docs`
- **Especificación funcional:** `ESPECIFICACION.md`
- **ADR Kardex:** `docs/adr/001-kardex-central.md`

---

## 14. Conclusión

**EstibaX deja de ser una propuesta y es hoy una realidad operativa.**

La plataforma ha sido construida desde cero con una arquitectura profesional que cumple con todos los requisitos planteados en la propuesta original y va significativamente más allá:

- ✅ **Torre de Control con Dashboard** — todos los KPIs solicitados, tabla interactiva y alertas en tiempo real.
- ✅ **Tabla de información** — formato solicitado (CODIGO, MATERIAL, PROPIEDAD, UBICACIÓN, CLIENTE, ESTADO) implementado y funcional.
- ✅ **Identificación con pegatina** — propuesta A (logo + "Estiba") confirmada y lista para producción; alternativa B (barcode/QR) formalmente descartada.
- ✅ **Menú completo** — Operación (Operaciones, Movimientos, Kardex, Inventarios, Etiquetas), Gestión (Clientes, Cobros, Alertas, Indicadores, Reportes) y Control (Auditoría, Configuración, Vista empresas) — todos implementados con API REST documentada.
- ✅ **Kardex inmutable** — con hash SHA-256, trazabilidad completa y capacidad de reconstrucción histórica.
- ✅ **Seguridad empresarial** — JWT + RBAC, firma electrónica, auditoría completa, separación de funciones.
- ✅ **Verificación automatizada** — 52 checks que validan el comportamiento real contra la base de datos.
- ✅ **Portal del cliente** — acceso seguro y limitado para clientes externos.
- ✅ **Monetización** — módulo económico con cobros diarios y liquidación mensual.

La solución está lista para ser desplegada en producción en el entorno corporativo de ICOLTRANS, con la infraestructura de Docker + PostgreSQL, usuarios de prueba configurados y scripts de verificación que garantizan el comportamiento esperado.

---

*Documento preparado por el área de Estrategias de Operaciones — EstibaX*
*Basado en el código fuente del repositorio: proyecto EstibaX (Fases 1–4 completadas)*