-- CreateTable
CREATE TABLE "cobro_diario" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "contrato_id" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidad_activos" INTEGER NOT NULL,
    "tarifa_unitario" DECIMAL(18,2) NOT NULL,
    "valor_total" DECIMAL(18,2) NOT NULL,
    "liquidacion_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cobro_diario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidacion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fin" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cobro_diario" ADD CONSTRAINT "cobro_diario_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
