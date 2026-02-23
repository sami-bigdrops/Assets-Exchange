ALTER TABLE "annotations" DROP CONSTRAINT "annotations_creative_request_id_creative_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN "creative_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN "admin_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN "position_data" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "creative_request_id";--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "shape";--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "coordinates";--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "comment";--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "annotations" DROP COLUMN "updatedAt";