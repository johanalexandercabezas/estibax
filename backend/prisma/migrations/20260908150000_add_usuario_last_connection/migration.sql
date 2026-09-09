ALTER TABLE "usuario"
ADD COLUMN "ultima_conexion_at" TIMESTAMP(3),
ADD COLUMN "ultima_conexion_ip" TEXT,
ADD COLUMN "ultima_conexion_user_agent" TEXT;
