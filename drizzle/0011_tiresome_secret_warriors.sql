CREATE TABLE "assets_table" (
	"id" text PRIMARY KEY NOT NULL,
	"publisher_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "batch_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_assets_batch_id_asset_id_unique" UNIQUE("batch_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_label" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"date" date PRIMARY KEY NOT NULL,
	"total_submitted" integer DEFAULT 0 NOT NULL,
	"total_approved" integer DEFAULT 0 NOT NULL,
	"avg_approval_time_seconds" double precision,
	"top_publishers" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "status_updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "scan_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "last_scan_error" text;--> statement-breakpoint
ALTER TABLE "external_tasks" ADD COLUMN "grammar_feedback" jsonb;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN "telegram_chat_id" text;--> statement-breakpoint
ALTER TABLE "batch_assets" ADD CONSTRAINT "batch_assets_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_assets" ADD CONSTRAINT "batch_assets_asset_id_assets_table_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assets_table_publisher_id" ON "assets_table" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "idx_assets_table_status" ON "assets_table" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assets_table_created_at" ON "assets_table" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_assets_table_approved_at" ON "assets_table" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "idx_batch_assets_batch_id" ON "batch_assets" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_batch_assets_asset_id" ON "batch_assets" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_batches_status" ON "batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_batches_created_by" ON "batches" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_batches_created_at" ON "batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_daily_stats_date" ON "daily_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_creatives_status_updated_at" ON "creatives" USING btree ("status","status_updated_at");