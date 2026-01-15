CREATE TABLE "background_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0,
	"total" integer DEFAULT 0,
	"payload" jsonb,
	"result" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sync_history" (
	"id" text PRIMARY KEY NOT NULL,
	"sync_type" text NOT NULL,
	"status" text NOT NULL,
	"started_by" text NOT NULL,
	"total_records" integer DEFAULT 0,
	"synced_records" integer DEFAULT 0,
	"updated_records" integer DEFAULT 0,
	"created_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"skipped_records" integer DEFAULT 0,
	"error_message" text,
	"sync_options" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "everflow_offer_id" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "everflow_advertiser_id" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "everflow_data" jsonb;--> statement-breakpoint
CREATE INDEX "idx_sync_type" ON "sync_history" USING btree ("sync_type");--> statement-breakpoint
CREATE INDEX "idx_sync_status" ON "sync_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_started_at" ON "sync_history" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_everflow_offer_id" ON "offers" USING btree ("everflow_offer_id");--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_everflow_offer_id_unique" UNIQUE("everflow_offer_id");