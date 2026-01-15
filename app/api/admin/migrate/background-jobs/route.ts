import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";


export async function POST(_req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
        "error_type" text,
        "attempt" integer DEFAULT 0 NOT NULL,
        "max_attempts" integer DEFAULT 3 NOT NULL,
        "next_run_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "started_at" timestamp,
        "finished_at" timestamp
      )
    `);

    await db.execute(sql`
      ALTER TABLE "background_jobs" 
      ADD COLUMN IF NOT EXISTS "error_type" text
    `);

    await db.execute(sql`
      ALTER TABLE "background_jobs" 
      ADD COLUMN IF NOT EXISTS "attempt" integer DEFAULT 0 NOT NULL
    `);

    await db.execute(sql`
      ALTER TABLE "background_jobs" 
      ADD COLUMN IF NOT EXISTS "max_attempts" integer DEFAULT 3 NOT NULL
    `);

    await db.execute(sql`
      ALTER TABLE "background_jobs" 
      ADD COLUMN IF NOT EXISTS "next_run_at" timestamp
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_background_jobs_status_created" 
      ON "background_jobs" ("status", "created_at")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_background_jobs_status_next_run" 
      ON "background_jobs" ("status", "next_run_at")
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "background_job_events" (
        "id" text PRIMARY KEY NOT NULL,
        "job_id" text NOT NULL REFERENCES "background_jobs"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "message" text,
        "data" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_background_job_events_job_id" 
      ON "background_job_events" ("job_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_background_job_events_created_at" 
      ON "background_job_events" ("created_at")
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Migration completed successfully" 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Migration failed";
    console.error("Migration failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: message
      },
      { status: 500 }
    );
  }
}

