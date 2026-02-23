-- Migration: Add batches and batch_assets tables
-- This migration creates two new tables to support batch operations for assets.
-- batches: Stores batch metadata and status information
-- batch_assets: Junction table linking batches to assets with unique constraint

-- Table: batches
-- Purpose: Stores batch information including label, description, status, and creator
-- Fields:
--   - id: Primary key (TEXT) - Unique identifier for the batch
--   - batch_label: Batch name/label (TEXT, NOT NULL) - Human-readable identifier
--   - description: Optional description of the batch (TEXT)
--   - status: Batch status (TEXT, default 'active') - Tracks batch lifecycle
--   - created_by: User ID who created the batch (TEXT) - References the creator
--   - created_at: Timestamp when batch was created (TIMESTAMP, default now())
--   - updated_at: Timestamp when batch was last updated (TIMESTAMP, default now())
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

-- Table: batch_assets
-- Purpose: Junction table linking batches to assets
-- Fields:
--   - id: Primary key (TEXT) - Unique identifier for the batch-asset relationship
--   - batch_id: Foreign key to batches.id (TEXT, NOT NULL) - References the batch
--   - asset_id: Foreign key to assets_table.id (TEXT, NOT NULL) - References the asset
--   - created_at: Timestamp when asset was added to batch (TIMESTAMP, default now())
-- Constraints:
--   - UNIQUE(batch_id, asset_id): Ensures an asset can only be added once per batch
--   - Foreign keys with ON DELETE CASCADE: Deleting a batch or asset removes related records
CREATE TABLE "batch_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_assets_batch_id_asset_id_unique" UNIQUE("batch_id","asset_id")
);
--> statement-breakpoint

-- Foreign Key: batch_assets.batch_id → batches.id
-- Purpose: Ensures batch_id references a valid batch
-- Behavior: ON DELETE CASCADE - Deleting a batch removes all associated batch_assets records
ALTER TABLE "batch_assets" ADD CONSTRAINT "batch_assets_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Foreign Key: batch_assets.asset_id → assets_table.id
-- Purpose: Ensures asset_id references a valid asset
-- Behavior: ON DELETE CASCADE - Deleting an asset removes it from all batches
ALTER TABLE "batch_assets" ADD CONSTRAINT "batch_assets_asset_id_assets_table_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets_table"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Index: idx_batch_assets_batch_id
-- Purpose: Optimize queries filtering by batch_id (e.g., "get all assets in a batch")
-- Table: batch_assets
-- Column: batch_id
CREATE INDEX "idx_batch_assets_batch_id" ON "batch_assets" USING btree ("batch_id");
--> statement-breakpoint

-- Index: idx_batch_assets_asset_id
-- Purpose: Optimize queries filtering by asset_id (e.g., "get all batches containing an asset")
-- Table: batch_assets
-- Column: asset_id
CREATE INDEX "idx_batch_assets_asset_id" ON "batch_assets" USING btree ("asset_id");
