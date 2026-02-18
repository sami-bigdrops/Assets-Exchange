ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "status_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "scan_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "last_scan_error" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creatives_status_updated_at" ON "creatives" USING btree ("status","status_updated_at");
