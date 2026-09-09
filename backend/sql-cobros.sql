-- DropForeignKey
ALTER TABLE "kardex_entry" DROP CONSTRAINT "kardex_entry_activo_id_fkey";

-- AlterTable
ALTER TABLE "kardex_entry" ADD COLUMN     "pool_ercol_id" TEXT,
ALTER COLUMN "activo_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "movimiento_linea" ADD COLUMN     "pool_ercol_id" TEXT;

-- CreateTable
CREATE TABLE "pool_ercol" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo_activo_id" TEXT NOT NULL,
    "cantidad_total" INTEGER NOT NULL DEFAULT 0,
    "cantidad_en_cliente" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pool_ercol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_facturable" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tarifaDiaria" DECIMAL(18,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_facturable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidacion_cf" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteFactId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "estibasDia" INTEGER NOT NULL,
    "cobro" DECIMAL(18,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidacion_cf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidacion_detalle" (
    "id" TEXT NOT NULL,
    "liquidacionId" TEXT NOT NULL,
    "plataformaNombre" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "entregadas" INTEGER NOT NULL,
    "devueltas" INTEGER NOT NULL,
    "saldoDiario" INTEGER NOT NULL,
    "cobroDiario" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "liquidacion_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pool_ercol_empresa_id_tipo_activo_id_key" ON "pool_ercol"("empresa_id", "tipo_activo_id");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_facturable_nombre_key" ON "cliente_facturable"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "liquidacion_cf_empresaId_clienteFactId_anio_mes_key" ON "liquidacion_cf"("empresaId", "clienteFactId", "anio", "mes");

-- AddForeignKey
ALTER TABLE "pool_ercol" ADD CONSTRAINT "pool_ercol_tipo_activo_id_fkey" FOREIGN KEY ("tipo_activo_id") REFERENCES "tipo_activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_linea" ADD CONSTRAINT "movimiento_linea_pool_ercol_id_fkey" FOREIGN KEY ("pool_ercol_id") REFERENCES "pool_ercol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kardex_entry" ADD CONSTRAINT "kardex_entry_activo_id_fkey" FOREIGN KEY ("activo_id") REFERENCES "activo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kardex_entry" ADD CONSTRAINT "kardex_entry_pool_ercol_id_fkey" FOREIGN KEY ("pool_ercol_id") REFERENCES "pool_ercol"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_facturable" ADD CONSTRAINT "cliente_facturable_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacion_cf" ADD CONSTRAINT "liquidacion_cf_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacion_cf" ADD CONSTRAINT "liquidacion_cf_clienteFactId_fkey" FOREIGN KEY ("clienteFactId") REFERENCES "cliente_facturable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacion_detalle" ADD CONSTRAINT "liquidacion_detalle_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "liquidacion_cf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

