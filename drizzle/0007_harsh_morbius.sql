CREATE TABLE "creatives" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"size" integer NOT NULL,
	"format" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "external_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"creative_id" text NOT NULL,
	"user_id" text,
	"source" text NOT NULL,
	"external_task_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	"error_message" text,
	"grammar_feedback" jsonb,
);
--> statement-breakpoint
ALTER TABLE "creative_requests" ADD COLUMN "from_lines" text;--> statement-breakpoint
ALTER TABLE "creative_requests" ADD COLUMN "subject_lines" text;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_request_id_creative_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."creative_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_creatives_request_id" ON "creatives" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_creatives_status" ON "creatives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_creatives_created_at" ON "creatives" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_external_tasks_creative_id" ON "external_tasks" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX "idx_external_tasks_status" ON "external_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_external_tasks_source" ON "external_tasks" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_external_tasks_external_task_id" ON "external_tasks" USING btree ("external_task_id");