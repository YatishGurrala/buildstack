ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "schemaName" TEXT;

UPDATE "Project"
SET "schemaName" = CONCAT('proj_', REPLACE("key", '-', '_'))
WHERE "schemaName" IS NULL;

ALTER TABLE "Project"
ALTER COLUMN "schemaName" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Project_schemaName_key" ON "Project"("schemaName");