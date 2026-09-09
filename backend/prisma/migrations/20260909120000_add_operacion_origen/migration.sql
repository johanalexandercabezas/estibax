-- AlterTable: agrega origen de la estiba (PROPIA/ERCOL, armonizado con Activo.propiedad)
ALTER TABLE "operacion" ADD COLUMN "origen" TEXT;

-- Backfill: las operaciones históricas quedan como PROPIA por defecto
UPDATE "operacion" SET "origen" = 'PROPIA' WHERE "origen" IS NULL;
