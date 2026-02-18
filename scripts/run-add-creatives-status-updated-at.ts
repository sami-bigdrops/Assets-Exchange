import { resolve } from "path";

import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const statements = [
  `ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "status_updated_at" timestamp DEFAULT now() NOT NULL`,
  `ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "scan_attempts" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "last_scan_error" text`,
  `CREATE INDEX IF NOT EXISTS "idx_creatives_status_updated_at" ON "creatives" USING btree ("status","status_updated_at")`,
];

async function run() {
  try {
    for (const statement of statements) {
      await pool.query(statement);
    }
    console.warn("Creatives status_updated_at migration completed.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
