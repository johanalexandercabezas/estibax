-- CreateEnum
CREATE TYPE "Propiedad" AS ENUM ('PROPIA', 'ERCOL', 'TERCERO');

-- CreateEnum
CREATE TYPE "EstadoFisico" AS ENUM ('BUENO', 'REGULAR', 'DANADO', 'CRITICO');

-- CreateEnum
CREATE TYPE "EstadoLogistico" AS ENUM ('DISPONIBLE', 'EN_TRANSITO', 'EN_CLIENTE', 'EN_REPARACION', 'PERDIDA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoOperativo" AS ENUM ('LIBRE', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'TRASLADO', 'DEVOLUCION', 'PRESTAMO', 'PERDIDA', 'DANIO', 'REPARACION', 'INVENTARIO_INICIAL', 'AJUSTE', 'REVERSION');

-- CreateEnum
CREATE TYPE "EstadoMovimiento" AS ENUM ('BORRADOR', 'CONFIRMADO', 'REVERTIDO');

-- CreateEnum
CREATE TYPE "EstadoNovedad" AS ENUM ('ABIERTA', 'EN_INVESTIGACION', 'EN_REPARACION', 'CERRADA');

-- CreateEnum
CREATE TYPE "DisposicionNovedad" AS ENUM ('REPARACION', 'INDEMNIZACION', 'BAJA', 'SIN_ACCION');

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sede" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planta" (
    "id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodega" (
    "id" TEXT NOT NULL,
    "planta_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bodega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zona" (
    "id" TEXT NOT NULL,
    "bodega_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "reglas_json" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transportista" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transportista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculo" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifa" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "tipo_activo_id" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "fecha_vigencia" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_activo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activo" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo_activo_id" TEXT NOT NULL,
    "propiedad" "Propiedad" NOT NULL,
    "valor_adquisicion" DECIMAL(18,2),
    "valor_reposicion" DECIMAL(18,2),
    "estado_fisico" "EstadoFisico" NOT NULL DEFAULT 'BUENO',
    "estado_logistico" "EstadoLogistico" NOT NULL DEFAULT 'DISPONIBLE',
    "estado_operativo" "EstadoOperativo" NOT NULL DEFAULT 'LIBRE',
    "ubicacion_id" TEXT,
    "cliente_id" TEXT,
    "qr_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secuencia_documento" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prefijo" TEXT NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secuencia_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "documento" TEXT NOT NULL,
    "fecha_efectiva" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoMovimiento" NOT NULL DEFAULT 'BORRADOR',
    "origen_id" TEXT,
    "destino_id" TEXT,
    "cliente_id" TEXT,
    "proveedor_id" TEXT,
    "vehiculo_id" TEXT,
    "transportista_id" TEXT,
    "responsable_id" TEXT,
    "correccion_de_id" TEXT,
    "motivo_correccion" TEXT,
    "hash_integridad" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_linea" (
    "id" TEXT NOT NULL,
    "movimiento_id" TEXT NOT NULL,
    "activo_id" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "estado_fisico" "EstadoFisico",
    "notas" TEXT,

    CONSTRAINT "movimiento_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kardex_entry" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "movimiento_id" TEXT NOT NULL,
    "movimiento_linea_id" TEXT,
    "fecha_efectiva" TIMESTAMP(3) NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo_id" TEXT NOT NULL,
    "ubicacion_id" TEXT,
    "cliente_id" TEXT,
    "cantidad_entra" INTEGER NOT NULL DEFAULT 0,
    "cantidad_sale" INTEGER NOT NULL DEFAULT 0,
    "saldo_despues" INTEGER NOT NULL,
    "hash_integridad" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kardex_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novedad" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "activo_id" TEXT NOT NULL,
    "movimiento_id" TEXT,
    "cliente_id" TEXT,
    "ubicacion_id" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "reportante_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoNovedad" NOT NULL DEFAULT 'ABIERTA',
    "causa" TEXT,
    "responsable" TEXT,
    "valor" DECIMAL(18,2),
    "indemnizacion" DECIMAL(18,2),
    "reparacion" DECIMAL(18,2),
    "disposicion" "DisposicionNovedad" DEFAULT 'SIN_ACCION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "novedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "permisos" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "rol_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "detalles" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_nit_key" ON "empresa"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "activo_codigo_key" ON "activo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "secuencia_documento_empresa_id_tipo_key" ON "secuencia_documento"("empresa_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_documento_key" ON "movimiento"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_correccion_de_id_key" ON "movimiento"("correccion_de_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "sede" ADD CONSTRAINT "sede_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planta" ADD CONSTRAINT "planta_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodega" ADD CONSTRAINT "bodega_planta_id_fkey" FOREIGN KEY ("planta_id") REFERENCES "planta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona" ADD CONSTRAINT "zona_bodega_id_fkey" FOREIGN KEY ("bodega_id") REFERENCES "bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifa" ADD CONSTRAINT "tarifa_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifa" ADD CONSTRAINT "tarifa_tipo_activo_id_fkey" FOREIGN KEY ("tipo_activo_id") REFERENCES "tipo_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activo" ADD CONSTRAINT "activo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activo" ADD CONSTRAINT "activo_tipo_activo_id_fkey" FOREIGN KEY ("tipo_activo_id") REFERENCES "tipo_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activo" ADD CONSTRAINT "activo_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activo" ADD CONSTRAINT "activo_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_transportista_id_fkey" FOREIGN KEY ("transportista_id") REFERENCES "transportista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_correccion_de_id_fkey" FOREIGN KEY ("correccion_de_id") REFERENCES "movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_linea" ADD CONSTRAINT "movimiento_linea_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_linea" ADD CONSTRAINT "movimiento_linea_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kardex_entry" ADD CONSTRAINT "kardex_entry_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kardex_entry" ADD CONSTRAINT "kardex_entry_movimiento_linea_id_fkey" FOREIGN KEY ("movimiento_linea_id") REFERENCES "movimiento_linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kardex_entry" ADD CONSTRAINT "kardex_entry_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedad" ADD CONSTRAINT "novedad_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

