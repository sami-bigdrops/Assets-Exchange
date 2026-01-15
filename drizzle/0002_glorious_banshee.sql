CREATE TYPE "public"."offer_created_method" AS ENUM('Manually', 'API');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('Active', 'Inactive');--> statement-breakpoint
CREATE TYPE "public"."offer_visibility" AS ENUM('Public', 'Internal', 'Hidden');--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"offer_name" text NOT NULL,
	"advertiser_id" text NOT NULL,
	"advertiser_name" text NOT NULL,
	"created_method" "offer_created_method" DEFAULT 'Manually' NOT NULL,
	"status" "offer_status" DEFAULT 'Active' NOT NULL,
	"visibility" "offer_visibility" DEFAULT 'Public' NOT NULL,
	"brand_guidelines" jsonb,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_offer_status" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_offer_visibility" ON "offers" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "idx_offer_created_method" ON "offers" USING btree ("created_method");--> statement-breakpoint
CREATE INDEX "idx_offer_advertiser_id" ON "offers" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "idx_offer_created_at" ON "offers" USING btree ("created_at");