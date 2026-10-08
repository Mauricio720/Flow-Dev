ALTER TABLE "local_machines" ADD COLUMN "loop_catalog" jsonb DEFAULT '[]'::jsonb NOT NULL;
