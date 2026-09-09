-- AlterTable
ALTER TABLE "movimiento" ADD COLUMN     "firma_cargo" TEXT,
ADD COLUMN     "firma_documento" TEXT,
ADD COLUMN     "firma_fecha" TIMESTAMP(3),
ADD COLUMN     "firma_nombre" TEXT;
