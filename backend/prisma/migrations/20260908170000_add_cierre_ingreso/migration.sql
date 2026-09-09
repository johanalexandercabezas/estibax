CREATE TABLE "cierre_ingreso" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "anio" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "dia_limite" INTEGER NOT NULL DEFAULT 2,
  "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
  "cerrado_at" TIMESTAMP(3),
  "cerrado_por" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cierre_ingreso_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cierre_ingreso_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "cierre_ingreso_empresa_id_anio_mes_key" ON "cierre_ingreso"("empresa_id", "anio", "mes");
