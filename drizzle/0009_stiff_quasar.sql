ALTER TABLE "creative_requests" ADD COLUMN "tracking_code" text;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "status_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "scan_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "last_scan_error" text;--> statement-breakpoint
ALTER TABLE "external_tasks" ADD COLUMN "grammar_feedback" jsonb;--> statement-breakpoint
CREATE INDEX "idx_creatives_status_updated_at" ON "creatives" USING btree ("status","status_updated_at");--> statement-breakpoint
ALTER TABLE "creative_requests" ADD CONSTRAINT "creative_requests_tracking_code_unique" UNIQUE("tracking_code");