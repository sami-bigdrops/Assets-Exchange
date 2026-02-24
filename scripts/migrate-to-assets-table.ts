/* eslint-disable no-console */
/**
 * Migration Script: creative_requests → assets_table
 *
 * This script:
 * 1. Creates the assets_table with required columns and indexes
 * 2. Migrates historical data from creative_requests to assets_table
 * 3. Verifies row counts match after migration
 *
 * Usage:
 *   pnpm tsx scripts/migrate-to-assets-table.ts
 */

import { resolve } from "path";

import { config } from "dotenv";
import { sql } from "drizzle-orm";

import { db } from "../lib/db";

config({ path: resolve(process.cwd(), ".env") });

async function migrateToAssetsTable() {
  console.log("=".repeat(80));
  console.log("MIGRATION: creative_requests → assets_table");
  console.log("=".repeat(80));
  console.log();

  try {
    console.log("Step 1: Creating assets_table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "assets_table" (
        "id" text PRIMARY KEY NOT NULL,
        "publisher_id" text NOT NULL,
        "status" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "approved_at" timestamp
      )
    `);
    console.log("✓ Table created");

    console.log();
    console.log("Step 2: Creating indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_assets_table_publisher_id" 
      ON "assets_table" ("publisher_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_assets_table_status" 
      ON "assets_table" ("status")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_assets_table_created_at" 
      ON "assets_table" ("created_at")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_assets_table_approved_at" 
      ON "assets_table" ("approved_at")
    `);
    console.log("✓ Indexes created");

    console.log();
    console.log("Step 3: Counting rows in creative_requests...");
    const sourceCountResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count FROM creative_requests
    `);
    const sourceRowCount = parseInt(sourceCountResult.rows[0].count, 10);
    console.log(`✓ Found ${sourceRowCount} rows in creative_requests`);

    console.log();
    console.log("Step 4: Counting existing rows in assets_table...");
    const existingCountResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count FROM assets_table
    `);
    const existingRowCount = parseInt(existingCountResult.rows[0].count, 10);
    console.log(`✓ Found ${existingRowCount} existing rows in assets_table`);

    if (existingRowCount > 0) {
      console.log();
      console.log(
        "⚠️  WARNING: assets_table already contains data. Skipping migration."
      );
      console.log(
        "   If you want to re-run the migration, please clear the table first."
      );
      console.log();
      console.log("Verifying row counts...");
      if (existingRowCount === sourceRowCount) {
        console.log(
          `✓ Row counts match: ${existingRowCount} rows in both tables`
        );
      } else {
        console.log(
          `⚠️  Row counts differ: ${existingRowCount} in assets_table vs ${sourceRowCount} in creative_requests`
        );
      }
      return;
    }

    console.log();
    console.log(
      "Step 5: Migrating data from creative_requests to assets_table..."
    );

    const beforeCount = existingRowCount;

    await db.execute(sql`
      INSERT INTO assets_table (id, publisher_id, status, created_at, approved_at)
      SELECT 
        id,
        publisher_id,
        status,
        submitted_at,
        admin_approved_at
      FROM creative_requests
      ON CONFLICT (id) DO NOTHING
    `);

    const afterCountResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count FROM assets_table
    `);
    const afterCount = parseInt(afterCountResult.rows[0].count, 10);
    const migratedCount = afterCount - beforeCount;

    console.log(`✓ Migrated ${migratedCount} rows`);

    console.log();
    console.log("Step 6: Verifying row counts...");
    const finalCountResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count FROM assets_table
    `);
    const finalRowCount = parseInt(finalCountResult.rows[0].count, 10);

    console.log(`  creative_requests: ${sourceRowCount} rows`);
    console.log(`  assets_table:      ${finalRowCount} rows`);

    if (sourceRowCount === finalRowCount) {
      console.log();
      console.log("✓ SUCCESS: Row counts match!");
    } else {
      console.log();
      console.log("⚠️  WARNING: Row counts do not match. Please investigate.");
      console.log(
        `   Difference: ${Math.abs(sourceRowCount - finalRowCount)} rows`
      );
    }

    console.log();
    console.log("Step 7: Sample verification...");
    const sampleResult = await db.execute<{
      id: string;
      publisher_id: string;
      status: string;
      created_at: Date;
      approved_at: Date | null;
    }>(sql`
      SELECT id, publisher_id, status, created_at, approved_at
      FROM assets_table
      LIMIT 5
    `);

    const sampleRows = Array.isArray(sampleResult)
      ? sampleResult
      : (sampleResult as { rows?: Array<unknown> }).rows || [];

    if (sampleRows.length > 0) {
      console.log("✓ Sample rows from assets_table:");
      sampleRows.forEach(
        (
          row: {
            id?: string;
            publisher_id?: string;
            status?: string;
            created_at?: Date | string;
            approved_at?: Date | string | null;
          },
          idx: number
        ) => {
          console.log(
            `  ${idx + 1}. ID: ${row.id?.slice(0, 8) || "N/A"}..., Publisher: ${row.publisher_id || "N/A"}, Status: ${row.status || "N/A"}, Created: ${row.created_at || "N/A"}, Approved: ${row.approved_at || "NULL"}`
          );
        }
      );
    } else {
      console.log("  No rows found to sample");
    }

    console.log();
    console.log("=".repeat(80));
    console.log("Migration completed successfully!");
    console.log("=".repeat(80));
  } catch (error) {
    console.error();
    console.error("=".repeat(80));
    console.error("Migration failed!");
    console.error("=".repeat(80));
    console.error(error);
    process.exit(1);
  }
}

migrateToAssetsTable()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
