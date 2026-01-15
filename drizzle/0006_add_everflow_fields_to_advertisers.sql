ALTER TABLE "advertisers" ADD COLUMN IF NOT EXISTS "everflow_advertiser_id" text;
ALTER TABLE "advertisers" ADD COLUMN IF NOT EXISTS "everflow_data" jsonb;

CREATE INDEX IF NOT EXISTS "idx_everflow_advertiser_id" ON "advertisers" ("everflow_advertiser_id");
