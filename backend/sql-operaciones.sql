-- CreateTable
CREATE TABLE "operacion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "plataforma_id" TEXT,
    "cliente_id" TEXT,
    "tipo_documento" TEXT NOT NULL,
    "numero_documento" TEXT NOT NULL,
    "ciudad" TEXT,
    "punto_entrega" TEXT,
    "manifiesto" TEXT,
    "entregadas" INTEGER NOT NULL DEFAULT 0,
    "carta_devolucion" TEXT,
    "devueltas" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operacion_empresa_id_fecha_idx" ON "operacion"("empresa_id", "fecha");

-- CreateIndex
CREATE INDEX "operacion_empresa_id_manifiesto_idx" ON "operacion"("empresa_id", "manifiesto");

-- CreateIndex
CREATE INDEX "operacion_empresa_id_numero_documento_idx" ON "operacion"("empresa_id", "numero_documento");

-- AddForeignKey
ALTER TABLE "operacion" ADD CONSTRAINT "operacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacion" ADD CONSTRAINT "operacion_plataforma_id_fkey" FOREIGN KEY ("plataforma_id") REFERENCES "sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacion" ADD CONSTRAINT "operacion_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

