# Reset Stuck Jobs - End-to-End Verification Guide

**Purpose:** Verify that the "Reset Stuck Jobs" button click successfully resolves stuck jobs at the database level, creates proper audit logs, and triggers system reprocessing.

**Last Updated:** $(date)

---

## Prerequisites

1. **Database Access:** Direct access to PostgreSQL database (via psql, DBeaver, or similar)
2. **Admin Account:** Valid admin user credentials
3. **Test Data:** At least one creative with `status = 'SCANNING'` and `status_updated_at` older than 15 minutes
4. **System Access:** Ability to monitor worker/queue/scanner processes

---

## Pre-Test Setup

### Step 1: Create Test Data

Create at least one creative stuck in SCANNING status for testing:

```sql
-- Insert a test creative stuck in SCANNING (older than 15 minutes)
INSERT INTO creatives (
  id,
  name,
  url,
  type,
  size,
  format,
  status,
  status_updated_at,
  scan_attempts,
  created_at,
  updated_at
) VALUES (
  'test-stuck-creative-' || generate_random_uuid()::text,
  'Test Stuck Creative',
  'https://example.com/test.jpg',
  'image',
  1024,
  'jpg',
  'SCANNING',
  now() - interval '20 minutes',  -- Older than 15 minutes
  1,
  now() - interval '25 minutes',
  now() - interval '20 minutes'
);
```

### Step 2: Record Pre-Test State

**Query to get stuck creatives before reset:**

```sql
SELECT
  id,
  status,
  status_updated_at,
  scan_attempts,
  last_scan_error,
  updated_at
FROM creatives
WHERE status = 'SCANNING'
  AND status_updated_at < now() - interval '15 minutes'
ORDER BY status_updated_at ASC;
```

**Save the results:**

- Note the IDs of stuck creatives
- Record the count
- Note the `status_updated_at` timestamps

---

## Verification Steps

### 1. Database Verification ✅

**Objective:** Confirm that items previously stuck in 'SCANNING' state have transitioned to 'PENDING' state.

#### Step 1.1: Execute Reset Action

1. Log in as admin user
2. Navigate to Admin Dashboard
3. Click "Reset Stuck Jobs" button
4. Confirm the action in the dialog
5. Wait for success message

#### Step 1.2: Verify Status Changes

**Query to verify status changes:**

```sql
-- Check if previously stuck creatives are now PENDING
SELECT
  id,
  status,
  status_updated_at,
  scan_attempts,
  last_scan_error,
  updated_at
FROM creatives
WHERE id IN (
  -- Replace with IDs from pre-test state
  'test-stuck-creative-xxx',
  'another-stuck-id'
)
ORDER BY status_updated_at DESC;
```

**Expected Results:**

- ✅ `status` = `'pending'` (not `'SCANNING'`)
- ✅ `status_updated_at` = Current timestamp (updated to now())
- ✅ `updated_at` = Current timestamp (updated to now())
- ✅ `scan_attempts` = Previous value + 1 (incremented)
- ✅ `last_scan_error` = Contains reset message or preserved existing error

#### Step 1.3: Verify No Fresh SCANNING Items Were Affected

**Query to ensure fresh SCANNING items remain unchanged:**

```sql
-- Check that fresh SCANNING items (< 15 minutes) were NOT reset
SELECT
  id,
  status,
  status_updated_at,
  EXTRACT(EPOCH FROM (now() - status_updated_at))/60 as minutes_ago
FROM creatives
WHERE status = 'SCANNING'
  AND status_updated_at >= now() - interval '15 minutes'
ORDER BY status_updated_at DESC;
```

**Expected Results:**

- ✅ All items still have `status = 'SCANNING'`
- ✅ `status_updated_at` unchanged
- ✅ `minutes_ago` < 15

#### Step 1.4: Count Verification

**Query to count reset items:**

```sql
-- Count items that were reset (status changed from SCANNING to pending)
SELECT
  COUNT(*) as reset_count
FROM creatives
WHERE status = 'pending'
  AND last_scan_error LIKE '%Reset by admin%'
  AND updated_at >= now() - interval '5 minutes';  -- Recent reset
```

**Expected Results:**

- ✅ Count matches the number shown in UI success message
- ✅ Count matches the number from pre-test state

---

### 2. Audit Log Verification ✅

**Objective:** Verify that the action is recorded in audit logs with administrator identity, timestamp, and affected count.

#### Step 2.1: Query Audit Logs

**Query to find the audit log entry:**

```sql
SELECT
  id,
  user_id,
  action,
  entity_type,
  entity_id,
  details,
  ip_address,
  user_agent,
  created_at
FROM audit_logs
WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
  AND created_at >= now() - interval '5 minutes'  -- Recent action
ORDER BY created_at DESC
LIMIT 1;
```

#### Step 2.2: Verify Audit Log Fields

**Check the following fields:**

1. **Administrator Identity:**

   ```sql
   SELECT
     user_id,
     details->'triggeringUser'->>'userId' as admin_user_id,
     details->'triggeringUser'->>'userEmail' as admin_email,
     details->'triggeringUser'->>'userName' as admin_name
   FROM audit_logs
   WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Results:**
   - ✅ `user_id` matches the logged-in admin user ID
   - ✅ `admin_user_id` in details matches `user_id`
   - ✅ `admin_email` matches admin user's email
   - ✅ `admin_name` matches admin user's name

2. **Timestamp:**

   ```sql
   SELECT
     created_at,
     details->>'timestamp' as action_timestamp,
     EXTRACT(EPOCH FROM (created_at - (details->>'timestamp')::timestamp)) as time_diff_seconds
   FROM audit_logs
   WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Results:**
   - ✅ `created_at` is recent (within last few minutes)
   - ✅ `action_timestamp` in details matches `created_at` (within 1-2 seconds)
   - ✅ `time_diff_seconds` < 5 seconds

3. **Affected Count:**

   ```sql
   SELECT
     details->>'affectedAssetCount' as affected_count,
     jsonb_array_length(details->'affectedAssetIds') as ids_count,
     details->'affectedAssetIds' as asset_ids
   FROM audit_logs
   WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Results:**
   - ✅ `affected_count` matches the number shown in UI
   - ✅ `ids_count` matches `affected_count`
   - ✅ `asset_ids` array contains the IDs of reset creatives

4. **Additional Metadata:**
   ```sql
   SELECT
     details->>'thresholdMinutes' as threshold_minutes,
     details->>'previousStatus' as previous_status,
     details->>'newStatus' as new_status,
     ip_address,
     user_agent
   FROM audit_logs
   WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   **Expected Results:**
   - ✅ `threshold_minutes` = `15`
   - ✅ `previous_status` = `'SCANNING'`
   - ✅ `new_status` = `'PENDING'`
   - ✅ `ip_address` is present (if available)
   - ✅ `user_agent` is present (if available)

#### Step 2.3: Verify Audit Log for Zero Results

If no stuck items were found, verify the audit log still exists:

```sql
SELECT
  user_id,
  action,
  details->>'affectedAssetCount' as affected_count,
  details->>'message' as message,
  created_at
FROM audit_logs
WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
  AND details->>'affectedAssetCount' = '0'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**

- ✅ Audit log entry exists even when count is 0
- ✅ `message` = `'No stuck assets found'`
- ✅ `affected_count` = `0`

---

### 3. System Behavior Verification ✅

**Objective:** Confirm that worker, queue, and scanner processes resume picking up the previously stuck items.

#### Step 3.1: Monitor Worker/Queue Logs

**Check worker logs for processing activity:**

1. **Check if PENDING items are being picked up:**

   ```sql
   -- Monitor creatives transitioning from PENDING to SCANNING (being processed)
   SELECT
     id,
     status,
     status_updated_at,
     updated_at
   FROM creatives
   WHERE status = 'SCANNING'
     AND status_updated_at >= now() - interval '10 minutes'
     AND id IN (
       -- IDs that were reset to PENDING
       SELECT id FROM creatives
       WHERE status = 'pending'
         AND last_scan_error LIKE '%Reset by admin%'
         AND updated_at >= now() - interval '10 minutes'
     )
   ORDER BY status_updated_at DESC;
   ```

2. **Check worker/queue logs:**
   - Look for log entries showing items being picked up from queue
   - Verify items with reset IDs are being processed
   - Check for any errors or warnings

#### Step 3.2: Verify Processing Pipeline

**Query to track item progression:**

```sql
-- Track the lifecycle of reset items
SELECT
  id,
  status,
  status_updated_at,
  scan_attempts,
  CASE
    WHEN status = 'pending' THEN 'Awaiting processing'
    WHEN status = 'SCANNING' THEN 'Currently being processed'
    WHEN status = 'approved' THEN 'Processing completed'
    WHEN status = 'rejected' THEN 'Processing failed'
    ELSE status
  END as current_state
FROM creatives
WHERE id IN (
  -- IDs that were reset
  SELECT id FROM creatives
  WHERE status = 'pending'
    AND last_scan_error LIKE '%Reset by admin%'
    AND updated_at >= now() - interval '30 minutes'
)
ORDER BY status_updated_at DESC;
```

**Expected Results:**

- ✅ Items transition from `'pending'` to `'SCANNING'` (being picked up)
- ✅ Items eventually transition to `'approved'` or `'rejected'` (processing complete)
- ✅ No items remain stuck in `'pending'` indefinitely

#### Step 3.3: Verify No Infinite Loop

**Check that reset items don't get stuck again:**

```sql
-- Check if any reset items are stuck in SCANNING again
SELECT
  id,
  status,
  status_updated_at,
  scan_attempts,
  EXTRACT(EPOCH FROM (now() - status_updated_at))/60 as minutes_stuck
FROM creatives
WHERE status = 'SCANNING'
  AND status_updated_at < now() - interval '15 minutes'
  AND id IN (
    -- IDs that were previously reset
    SELECT id FROM creatives
    WHERE last_scan_error LIKE '%Reset by admin%'
  )
ORDER BY status_updated_at ASC;
```

**Expected Results:**

- ✅ No items found (or items are being actively processed)
- ✅ If items found, they should transition to PENDING again (not stuck)

---

### 4. Checkpoint Verification ✅

**Objective:** Confirm that the button click successfully resolves stuck jobs at the database level, not just UI changes.

#### Step 4.1: Database State Before and After

**Before Reset:**

```sql
-- Record state before reset
SELECT
  COUNT(*) as stuck_count,
  array_agg(id) as stuck_ids,
  MIN(status_updated_at) as oldest_stuck,
  MAX(status_updated_at) as newest_stuck
FROM creatives
WHERE status = 'SCANNING'
  AND status_updated_at < now() - interval '15 minutes';
```

**After Reset:**

```sql
-- Verify state after reset
SELECT
  COUNT(*) as pending_count,
  array_agg(id) as pending_ids
FROM creatives
WHERE status = 'pending'
  AND last_scan_error LIKE '%Reset by admin%'
  AND updated_at >= now() - interval '5 minutes';
```

**Expected Results:**

- ✅ `stuck_count` (before) = `pending_count` (after)
- ✅ All `stuck_ids` appear in `pending_ids`
- ✅ Status changed from `'SCANNING'` to `'pending'`

#### Step 4.2: Verify UI Matches Database

**Compare UI response with database:**

```sql
-- Get actual database count
SELECT COUNT(*) as actual_reset_count
FROM creatives
WHERE status = 'pending'
  AND last_scan_error LIKE '%Reset by admin%'
  AND updated_at >= now() - interval '5 minutes';
```

**Expected Results:**

- ✅ UI shows: "✅ X stuck jobs were reset to PENDING"
- ✅ Database `actual_reset_count` = X
- ✅ Numbers match exactly

#### Step 4.3: Verify Timestamps

**Check that timestamps were updated:**

```sql
SELECT
  id,
  status,
  status_updated_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - status_updated_at)) as time_diff_seconds
FROM creatives
WHERE status = 'pending'
  AND last_scan_error LIKE '%Reset by admin%'
  AND updated_at >= now() - interval '5 minutes';
```

**Expected Results:**

- ✅ `status_updated_at` = Recent timestamp (within last few minutes)
- ✅ `updated_at` = Recent timestamp (within last few minutes)
- ✅ `time_diff_seconds` < 5 seconds (both updated at same time)

---

## Verification Checklist

Use this checklist to track verification progress:

### Database Verification

- [ ] Pre-test state recorded (stuck creatives identified)
- [ ] Button clicked and confirmed
- [ ] Status changed from `'SCANNING'` to `'pending'`
- [ ] `status_updated_at` updated to current timestamp
- [ ] `updated_at` updated to current timestamp
- [ ] `scan_attempts` incremented by 1
- [ ] `last_scan_error` contains reset message
- [ ] Fresh SCANNING items (< 15 min) remain unchanged
- [ ] Count matches UI message

### Audit Log Verification

- [ ] Audit log entry created
- [ ] `user_id` matches admin user ID
- [ ] `action` = `'RESET_STUCK_SCANNING_ASSETS'`
- [ ] `created_at` timestamp is recent
- [ ] `details.triggeringUser.userId` matches admin ID
- [ ] `details.triggeringUser.userEmail` matches admin email
- [ ] `details.triggeringUser.userName` matches admin name
- [ ] `details.affectedAssetCount` matches reset count
- [ ] `details.affectedAssetIds` contains correct IDs
- [ ] `details.thresholdMinutes` = 15
- [ ] `details.previousStatus` = `'SCANNING'`
- [ ] `details.newStatus` = `'PENDING'`
- [ ] `ip_address` present (if available)
- [ ] `user_agent` present (if available)

### System Behavior Verification

- [ ] Reset items transition from `'pending'` to `'SCANNING'` (picked up)
- [ ] Items eventually complete processing
- [ ] No items remain stuck in `'pending'` indefinitely
- [ ] No infinite loop (items don't get stuck again)
- [ ] Worker/queue logs show processing activity

### Checkpoint Verification

- [ ] Database state changed (not just UI)
- [ ] UI count matches database count
- [ ] All timestamps updated correctly
- [ ] Status changes are persistent (survive page refresh)

---

## Troubleshooting

### Issue: Status Not Changed

**Symptoms:** Items remain in `'SCANNING'` status after reset

**Check:**

1. Verify items meet criteria (`status = 'SCANNING'` AND `status_updated_at < now() - 15 minutes`)
2. Check database logs for UPDATE query errors
3. Verify transaction committed successfully

### Issue: Audit Log Missing

**Symptoms:** No audit log entry created

**Check:**

1. Check application logs for audit log insertion errors
2. Verify `audit_logs` table exists and is accessible
3. Check database constraints (NOT NULL fields)

### Issue: Items Not Being Processed

**Symptoms:** Items remain in `'pending'` after reset

**Check:**

1. Verify worker/queue processes are running
2. Check worker logs for errors
3. Verify queue configuration
4. Check if items meet processing criteria

### Issue: Count Mismatch

**Symptoms:** UI shows different count than database

**Check:**

1. Verify database query matches endpoint logic
2. Check for race conditions (items changed between SELECT and UPDATE)
3. Verify transaction isolation level

---

## SQL Queries Summary

### Quick Verification Query

```sql
-- One query to verify everything
SELECT
  c.id,
  c.status,
  c.status_updated_at,
  c.scan_attempts,
  c.last_scan_error,
  a.user_id as admin_id,
  a.created_at as audit_timestamp,
  a.details->>'affectedAssetCount' as reset_count
FROM creatives c
LEFT JOIN audit_logs a ON (
  a.action = 'RESET_STUCK_SCANNING_ASSETS'
  AND a.created_at >= now() - interval '10 minutes'
  AND c.id = ANY(
    SELECT jsonb_array_elements_text(a.details->'affectedAssetIds')
  )
)
WHERE c.status = 'pending'
  AND c.last_scan_error LIKE '%Reset by admin%'
  AND c.updated_at >= now() - interval '10 minutes'
ORDER BY c.updated_at DESC;
```

---

## Success Criteria

✅ **All verification steps pass:**

- Database state changed correctly
- Audit logs created with complete information
- System processes resume picking up items
- UI matches database reality

✅ **No issues found:**

- No stuck items remain
- No missing audit logs
- No processing failures
- No count mismatches

---

**Verification Complete:** ✅ / ❌  
**Date:** ******\_\_\_******  
**Verified By:** ******\_\_\_******  
**Notes:** ******\_\_\_******
