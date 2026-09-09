const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

(async () => {
  try {
    await p.$executeRaw`
      UPDATE _prisma_migrations
      SET finished_at = NOW(), success = true, error = null
      WHERE migration_name = '20260828010000_add_empresa_contrato';
    `;

    await p.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'contrato' AND column_name = 'empresa_id'
        ) THEN
          ALTER TABLE "contrato" ADD COLUMN "empresa_id" UUID;
        END IF;
      END $$;
    `;

    await p.$executeRaw`
      UPDATE "contrato" AS c
      SET "empresa_id" = (
        SELECT cli."empresa_id" FROM "cliente" cli
        WHERE cli."id" = c."cliente_id"
      )::UUID
      WHERE c."empresa_id" IS NULL;
    `;

    await p.$executeRaw`
      ALTER TABLE "contrato" ALTER COLUMN "empresa_id" SET NOT NULL;
    `;

    await p.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_contrato_empresa_id" ON "contrato"("empresa_id");
    `;

    await p.$executeRaw`
      ALTER TABLE "contrato"
      ADD CONSTRAINT "contrato_empresa_id_fkey"
      FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    `;

    console.log('MANUAL_MIGRATION_OK');
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
