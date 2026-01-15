import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

async function runMigration() {
  try {
    console.log("Creating background_jobs table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "background_jobs" (
        "id" text PRIMARY KEY NOT NULL,
        "type" text NOT NULL,
        "status" text NOT NULL,
        "progress" integer DEFAULT 0,
        "total" integer DEFAULT 0,
        "payload" jsonb,
        "result" jsonb,
        "error" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "started_at" timestamp,
        "finished_at" timestamp
      )
    `);

    console.log("Creating index on background_jobs...");
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_background_jobs_status_created" 
      ON "background_jobs" ("status", "created_at")
    `);

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();

