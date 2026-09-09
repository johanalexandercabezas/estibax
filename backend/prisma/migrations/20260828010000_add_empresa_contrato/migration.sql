-- AlterTable
ALTER TABLE "contrato" ADD COLUMN "empresa_id" TEXT;

-- Update existing rows to use the empresa_id from the related cliente
UPDATE "contrato" AS c
SET "empresa_id" = (SELECT cli."empresa_id" FROM "cliente" cli WHERE cli."id" = c."cliente_id")
WHERE c."empresa_id" IS NULL;

-- AlterTable
ALTER TABLE "contrato" ALTER COLUMN "empresa_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "idx_contrato_empresa_id" ON "contrato"("empresa_id");

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

