# Commit Guide - Creative Schema Alignment & Recovery Endpoint

## Commit 1: Schema Synchronization (Phase 1)

**Title:** `feat(schema): align creatives table with production Neon DB schema`

**Description:**
Add missing columns and index to creatives table to match production Neon DB schema exactly.

**Files Changed:**
- `lib/schema.ts`

**Changes:**
- Add `statusUpdatedAt: timestamp("status_updated_at").notNull().defaultNow()`
- Add `scanAttempts: integer("scan_attempts").notNull().default(0)`
- Add `lastScanError: text("last_scan_error")`
- Add composite index `idx_creatives_status_updated_at` on `(status, status_updated_at)`

**Verification:**
- Schema now matches production Neon DB schema exactly
- All columns have correct types, nullability, and defaults
- Index matches production specification

---

## Commit 2: Status Transition Safety (Phase 2)

**Title:** `feat(creatives): enforce status transition consistency with status_updated_at and scan tracking`

**Description:**
Implement safe status update helpers and fix insert location to ensure:
- `status_updated_at` is always updated when status changes
- `scan_attempts` increments when status becomes SCANNING
- `last_scan_error` is set on scan failures

**Files Changed:**
- `lib/services/creative-status.service.ts` (NEW)
- `app/api/submit/route.ts`

**Changes:**
- Create `updateCreativeStatus()` helper function with safety checks
- Create `updateCreativeStatuses()` for bulk updates
- Update creative insert to include `statusUpdatedAt` and `scanAttempts`

**Verification:**
- All status updates now enforce consistency
- SCANNING status increments scan_attempts
- Scan failures set last_scan_error
- Insert location includes required fields

---

## Commit 3: Admin Recovery Endpoint (Phase 3)

**Title:** `feat(admin): add endpoint to reset stuck SCANNING creatives`

**Description:**
Add admin-only endpoint to safely reset creatives stuck in SCANNING status for more than 30 minutes.

**Files Changed:**
- `app/api/admin/creatives/reset-stuck-scanning/route.ts` (NEW)

**Changes:**
- Create POST endpoint `/api/admin/creatives/reset-stuck-scanning`
- Admin-only access (checks role === "admin")
- Resets only stuck rows (SCANNING status older than 30 minutes)
- Ignores fresh SCANNING rows
- Sets status to "pending" with descriptive error message
- Updates status_updated_at and updated_at timestamps
- Includes audit logging

**Verification:**
- Endpoint is admin protected
- Only resets stuck rows (30+ minutes old)
- Preserves existing error messages
- Includes comprehensive logging

---

## Summary

Three separate commits ensure:
1. **Schema sync** - Database schema alignment (no runtime changes)
2. **Status safety** - Runtime consistency enforcement
3. **Admin recovery** - Operational tool for stuck jobs

Each commit is self-contained and can be reviewed/deployed independently.
