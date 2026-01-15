CREATE TYPE "public"."admin_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."advertiser_status" AS ENUM('pending', 'approved', 'rejected', 'sent_back');--> statement-breakpoint
CREATE TYPE "public"."approval_stage" AS ENUM('admin', 'advertiser', 'completed');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('High Priority', 'Medium Priority');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('new', 'pending', 'approved', 'rejected', 'sent-back');--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"creative_request_id" text NOT NULL,
	"type" text NOT NULL,
	"shape" text,
	"coordinates" text,
	"comment" text,
	"created_by" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_request_history" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"action_type" text NOT NULL,
	"old_status" text,
	"new_status" text NOT NULL,
	"old_approval_stage" text,
	"new_approval_stage" text NOT NULL,
	"action_by" text NOT NULL,
	"action_role" text NOT NULL,
	"comments" text,
	"action_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"offer_name" text NOT NULL,
	"creative_type" text NOT NULL,
	"creative_count" integer NOT NULL,
	"from_lines_count" integer NOT NULL,
	"subject_lines_count" integer NOT NULL,
	"publisher_id" text NOT NULL,
	"publisher_name" text,
	"advertiser_id" text NOT NULL,
	"advertiser_name" text NOT NULL,
	"affiliate_id" text NOT NULL,
	"client_id" text NOT NULL,
	"client_name" text NOT NULL,
	"status" "request_status" DEFAULT 'new' NOT NULL,
	"approval_stage" "approval_stage" DEFAULT 'admin' NOT NULL,
	"priority" "priority" NOT NULL,
	"admin_status" "admin_status" DEFAULT 'pending',
	"admin_approved_by" text,
	"admin_approved_at" timestamp,
	"admin_comments" text,
	"advertiser_status" "advertiser_status",
	"advertiser_responded_by" text,
	"advertiser_responded_at" timestamp,
	"advertiser_comments" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"primary_color" text,
	"secondary_color" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_creative_request_id_creative_requests_id_fk" FOREIGN KEY ("creative_request_id") REFERENCES "public"."creative_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_request_history" ADD CONSTRAINT "creative_request_history_request_id_creative_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."creative_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_request_id" ON "creative_request_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_action_at" ON "creative_request_history" USING btree ("action_at");--> statement-breakpoint
CREATE INDEX "idx_status_stage" ON "creative_requests" USING btree ("status","approval_stage");--> statement-breakpoint
CREATE INDEX "idx_admin_status" ON "creative_requests" USING btree ("admin_status");--> statement-breakpoint
CREATE INDEX "idx_advertiser_status" ON "creative_requests" USING btree ("advertiser_status");--> statement-breakpoint
CREATE INDEX "idx_submitted_at" ON "creative_requests" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_offer_id" ON "creative_requests" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "idx_advertiser_id" ON "creative_requests" USING btree ("advertiser_id");