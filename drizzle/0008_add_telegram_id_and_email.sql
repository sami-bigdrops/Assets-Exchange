--> statement-breakpoint
ALTER TABLE "creative_requests" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "creative_requests" ADD COLUMN IF NOT EXISTS "telegram_id" text;--> statement-breakpoint
ALTER TABLE "publishers" ADD COLUMN IF NOT EXISTS "telegram_id" text;
