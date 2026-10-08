ALTER TABLE "local_machines" ADD COLUMN "provider_catalog" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "software_connections" ADD COLUMN "model_catalog" jsonb;