-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "cliente_id" TEXT;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
