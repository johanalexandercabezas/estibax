# Manual de Usuario — EstibaX

**Versión:** 1.0 · **Audiencia:** operarios de bodega, operadores logísticos, supervisores y administradores.

EstibaX es la plataforma para el control integral de estibas/palés como **activos retornables**: quién es dueño (propiedad), quién las tiene (custodia) y dónde están (ubicación), con kardex inmutable, numeración consecutiva y auditoría completa.

---

## 1. Acceso al sistema

1. Abre el navegador en `http://localhost:5173` (producción local) o la URL de tu empresa.
2. Inicia sesión con tu correo corporativo y contraseña.
3. El menú lateral muestra **solo los módulos que tu rol permite**.

### Instalación en móvil (PWA)

EstibaX es una **PWA instalable**: en Chrome/Edge (escritorio o Android) abre la app y usa el icono de instalación de la barra de direcciones ("Instalar EstibaX"). Se abre en su propia ventana con icono corporativo verde ICOLTRANS. El service worker permite el arranque offline del shell de la aplicación; los datos siempre se cargan en vivo desde la API.

### Roles y qué ven en el menú

| Módulo | ADMIN | OPERADOR | CONSULTA | CLIENTE |
|---|:-:|:-:|:-:|:-:|
| Torre de Control | ✅ | ✅ | ✅ | ✅ |
| Activos / Operaciones / Clientes / Novedades / Transportes | ✅ | ✅ | lectura* | ❌ |
| Cobros y Liquidaciones / Auditoría / Configuración | ✅ | ❌ | ❌ | ❌ |
| Reportes | ✅ | ❌ | ✅ | ❌ |

\* el backend valida: lo que no puedes hacer, responde 403 aunque la ruta exista.

**Usuarios de demostración (seed):** `admin@estibax.local / Admin123!` · `operador@estibax.local / Operador123!` · `cliente@abc.local / Cliente123!`

---

## 2. Operaciones — Data Grid de digitación masiva

La página de **Operaciones** es un data grid profesional estilo ERP (tipo hoja de cálculo), diseñado para **digitación masiva con teclado**, sin formularios largos.

### Estructura de columnas

Cada fila es una operación completa. Las columnas van de izquierda a derecha:

| # | Columna | Control |
|---|---------|---------|
| 1 | **Fecha** | Date picker nativo (fija) |
| 2 | **Plataforma** | Autocomplete con búsqueda (fija) |
| 3 | **Cliente** | Autocomplete con búsqueda (fija) |
| 4 | Tipo doc. | Selector (Orden compra / Carta devolución) |
| 5 | N.º documento | Texto — valida duplicados |
| 6 | Ciudad destino | Autocomplete |
| 7 | Punto de entrega | Autocomplete |
| 8 | Manifiesto | Texto — valida duplicados |
| 9 | Entregadas | Numérico (≥ 0) |
| 10 | N.º carta dev. | Texto |
| 11 | Devueltas | Numérico (≥ 0) |

### Navegación por teclado

| Tecla | Acción |
|---|---|
| TAB / ENTER | Siguiente columna. Al final de la fila: **guarda y crea una nueva** |
| SHIFT+TAB | Columna anterior |
| ↑ / ↓ | Moverse entre filas manteniendo la columna |
| ESC | Salir de la celda |

### Estados de fila

- 🟢 **Verde** — Completa: todos los obligatorios presentes, sin duplicados
- 🟡 **Amarillo** — Pendiente: faltan datos (fecha, documento, plataforma o cliente)
- 🔴 **Rojo** — Error: número de documento o manifiesto duplicado

### Productividad

- **📋 Duplicar fila**: copia plataforma/cliente/ciudad/punto de una operación existente para solo cambiar documento y cantidades.
- **Nueva fila copia la anterior**: al agregar una operación, hereda los valores de la fila previa.
- **Flujo continuo**: al completar la última columna con TAB/ENTER, la fila se guarda y continúa con una nueva.

### Validaciones en tiempo real

- Número de orden de compra **duplicado → rechazado** por el backend (400).
- Manifiesto repetido → **advertencia visual** (⚠ amarillo) sin bloquear.
- Entregadas/devueltas deben ser **enteros ≥ 0**.

### Herramientas

- **Búsqueda global** por documento, manifiesto, cliente, ciudad o punto.
- **Filtros** por tipo de documento y plataforma.
- **Resumen inferior**: Total / Completas / Pendientes / Errores.

### Diseño

- **Encabezados fijos** (sticky) al hacer scroll vertical.
- **Primeras 3 columnas fijas** (Fecha, Plataforma, Cliente) al hacer scroll horizontal.
- **Vista móvil**: en pantallas pequeñas, el grid se transforma en tarjetas por operación.


## 3. Torre de Control (Dashboard)

Pantalla inicial con:

- **4 KPIs**: Total Estibas, En Uso, Disponibles, Dañadas/Mantenimiento (rojo).
- **Barra de búsqueda global** con filtros rápidos por zona y material.
- **Tabla de estibas**: haz clic en un código para abrir la Ficha 360°.
- **Excepciones accionables** (pérdidas, daños, bloqueados, en custodia): cada indicador es clicable y lleva al detalle para actuar.

---

## 4. Activos y Ficha 360°

- **Listado con filtros** por los tres ejes de estado (físico, logístico, operativo) y por propiedad (PROPIA / ERCOL / TERCERO).
- **Registrar activo**: botón "Registrar Nueva Estiba" → código `EST-XXXXXX`, tipo, propiedad, ubicación y valores.
- **Ficha 360°**: estados actuales, jerarquía de ubicación (Sede → Planta → Bodega → Zona), historial de movimientos, novedades y asientos de kardex. Incluye **código QR** descargable/imprimible.
- **Bloquear / Desbloquear**: el desbloqueo requiere el permiso `LIBERAR_ACTIVO` (solo supervisores).

> **Nota ERCOL:** las estibas de propiedad ERCOL **no llevan código ni consecutivo propio** — son estibas del proveedor que se entregan a clientes por necesidad de despacho y se controlan solo como conteo por cliente (entregadas − devueltas = pendientes).

---

## 5. Movimientos de estibas (kardex)

Flujo para toda entrega, devolución, traslado o préstamo:

1. **Crear borrador**: tipo de movimiento, cliente destino (en salidas/préstamos) y los activos incluidos.
2. **Despacho**: en SALIDA, PRÉSTAMO, DEVOLUCIÓN y TRASLADO puedes asignar **vehículo** (placa) y **transportista** (opcionales, del catálogo de Transportes). El despacho queda registrado en el movimiento, visible en la columna "Despacho" del listado y en el PDF de movimientos.
3. **Confirmar**: el sistema valida reglas del cliente (puede recibir esa propiedad, cantidad máxima, aval) y exige **firma electrónica** (nombre, documento y cargo de quien recibe) en SALIDAS, PRÉSTAMOS y DEVOLUCIONES.
4. Al confirmar se genera el **documento consecutivo** (`SAL-000001`, `DEV-000001`, `REV-000001`…) y el asiento inmutable en el kardex con hash SHA-256.
5. **Revertir**: los movimientos confirmados **nunca se editan ni se eliminan**; la corrección se hace con una reversión que exige motivo y queda auditada.

---

## 6. Clientes

- Reglas de despacho configurables por cliente: propiedades que puede recibir, cantidad máxima y si requiere aval.
- **Balance de devolución automático**: entregadas − devueltas = pendientes, con semáforo por propiedad.

## 7. Novedades (daños, pérdidas, investigación)

1. **Reportar** novedad (daño o pérdida) → el activo se **bloquea automáticamente**.
2. **Investigar**: causa y responsable.
3. **Resolver**: reparación, indemnización (usa valor de reposición) o baja.
4. **Completar reparación**: la **inspección humana obligatoria** libera el activo a BUENO/LIBRE/DISPONIBLE. La IA nunca decide la liberación.

## 8. Cobros y Liquidaciones

- Contratos con **tarifas históricas** (fecha de vigencia + valor).
- **Generar cobro diario** por custodia de activos.
- **Liquidación mensual** por cliente y periodo, con estado del pago.
- **Cobros por plataforma (algoritmo Excel)**: replica el libro de cobros de ICOLTRANS
  (`Cobros > Cobros por plataforma`). Para el año/mes seleccionado:
  1. Toma los movimientos **confirmados** del mes (entregas = SALIDA/PRÉSTAMO, devoluciones = DEVOLUCIÓN).
  2. Calcula el **saldo diario** por cliente × plataforma: `saldo[día] = saldo[día-1] + entregadas − devueltas`.
  3. Acumula las **estibas-día** del mes y las multiplica por la **tarifa diaria** del cliente facturable.
  4. El total a facturar se muestra por cliente con desglose diario (fecha, plataforma, entregadas, devueltas, saldo, cobro del día) y se conserva para auditoría.
  5. **Exportar Excel (CSV)**: el botón descarga un CSV compatible con Excel (abre directo con formato de columnas) con el resumen por cliente y el detalle diario completo del mes.
  6. **Liquidación PDF**: genera la liquidación mensual formal con encabezado corporativo ICOLTRANS, resumen por cliente con total a facturar, y una página de detalle diario por cada cliente (fecha, plataforma, entregadas, devueltas, saldo y cobro del día).
  7. **Cerrar mes**: el botón **"🔒 Cerrar mes"** marca las liquidaciones del periodo como **CERRADA** (definitivas). Al regenerar, las liquidaciones cerradas **no se sobreescriben** aunque cambien los movimientos; el listado muestra el estado (ABERTA/🔒 CERRADA) y un aviso de periodo cerrado.
  8. **Historial de periodos**: tarjeta con el resumen de todos los periodos liquidados (año/mes, clientes, estibas-día, total a facturar y estado 🔒 Cerrado o Parcial), ordenada de más reciente a más antigua. El botón **"Ver"** carga el periodo seleccionado en los selectores para revisar su detalle diario, CSV o PDF. El botón **"Exportar historial (CSV)"** descarga el consolidado de todos los periodos.
- Los **clientes facturables** (5 en el seed: ABC, XYZ, Alfa, Beta, Gamma) y sus tarifas diarias se gestionan desde **Configuración → Clientes facturables** (solo superusuario): crear, editar tarifa, activar/desactivar. El nombre debe coincidir con el cliente del movimiento para que aplique su tarifa.

## 9. Inventarios e Indicadores por sede

El selector **Sede / Plataforma activa** (barra superior) contextualiza todas las pantallas. En **Inventarios** e **Indicadores** además verás:

- **Inventarios**: desglose del inventario (por estado logístico, propiedad y tipo) de la sede activa, una tabla **"Inventario por sede / plataforma"** que compara las 8 plataformas en totales, en cliente, dañados y sin ubicación, y el botón **"Exportar Excel (CSV)"** que descarga el resumen por sede más el detalle completo de activos (código, tipo, propiedad, estados y zona) respetando el alcance de la sede activa.
- **Indicadores**: exactitud de inventario y sanidad de flota de la sede activa, más la tabla **"KPIs por sede"** con exactitud %, sanidad %, dañados, bloqueados y pérdidas por cada plataforma (verde ≥90 %, naranja ≥70 %, rojo <70 %).
- **Dashboard**: tarjeta **"Alertas recientes"** con las novedades abiertas/en investigación de la sede activa (código del activo, descripción y estado), con enlace directo al módulo de Novedades para actuar.

## 10. Reportes, Auditoría y Configuración

- **Reportes**: métricas de operación y exportación a **PDF** de **movimientos**, **kardex** y **novedades** (este último con encabezado corporativo ICOLTRANS y desglose por sede, fecha, estado, disposición y valor). Todo respeta el filtro de sede activa.
- **Auditoría**: registro inmutable de quién hizo qué, cuándo y sobre qué entidad, con filtros.
- **Configuración**: datos de empresa, sedes, tipos de activo, **ubicaciones** (árbol Sede → Planta → Bodega → Zona), roles/permisos RBAC y clientes facturables.
- **Vista para empresas** (módulo Control): resumen corporativo de solo lectura con la empresa (nombre y NIT), las sedes/plataformas configuradas, el catálogo de materiales, los roles con conteo de módulos y usuarios, y los clientes facturables con sus tarifas diarias.

---

## 11. Solución de problemas

| Problema | Acción |
|---|---|
| La página carga en blanco | Ejecuta `INICIAR-ESTIBAX.cmd` y luego **Ctrl+F5** en el navegador |
| "403" al abrir un módulo | Tu rol no tiene ese permiso; solicítalo al administrador |
| No inicia sesión | Verifica credenciales del seed o contacta al admin |
| El login expira | Vuelve a iniciar sesión (el token dura una sesión) |
