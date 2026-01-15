CREATE INDEX IF NOT EXISTS "idx_background_jobs_status_created" ON "background_jobs" ("status", "created_at");

