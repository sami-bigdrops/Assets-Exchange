CREATE TYPE "public"."file_status" AS ENUM('pending_scan', 'clean', 'infected', 'deleted');--> statement-breakpoint
CREATE TABLE "advertisers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"everflow_advertiser_id" text,
	"everflow_data" jsonb,
	"brand_guidelines" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "background_job_events" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"original_name" text NOT NULL,
	"stored_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"storage_key" text NOT NULL,
	"storage_provider" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"status" "file_status" DEFAULT 'pending_scan' NOT NULL,
	"scanned_at" timestamp,
	"scan_result" jsonb,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"response_body" jsonb,
	"response_status" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"actor_role" text NOT NULL,
	"actor_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "error_type" text;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "attempt" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "max_retries" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "last_error_at" timestamp;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "dead_lettered_at" timestamp;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "next_run_at" timestamp;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "background_job_events" ADD CONSTRAINT "background_job_events_job_id_background_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."background_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_everflow_advertiser_id" ON "advertisers" USING btree ("everflow_advertiser_id");--> statement-breakpoint
CREATE INDEX "idx_background_job_events_job_id" ON "background_job_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_background_job_events_created_at" ON "background_job_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_uploaded_by" ON "file_uploads" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_entity" ON "file_uploads" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_status" ON "file_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_created_at" ON "file_uploads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_file_uploads_deleted_at" ON "file_uploads" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_expires_at" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_background_jobs_status_created" ON "background_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_background_jobs_status_next_run" ON "background_jobs" USING btree ("status","next_run_at");