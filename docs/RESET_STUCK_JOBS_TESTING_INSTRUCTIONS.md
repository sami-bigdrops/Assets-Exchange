# Reset Stuck Jobs - Testing Instructions

**Quick Start Guide for Verifying Button Functionality**

---

## Prerequisites

1. **Database Access:** PostgreSQL connection string configured
2. **Admin Account:** Valid admin user credentials
3. **Node.js:** For running verification script
4. **Browser:** For UI testing

---

## Quick Test Procedure

### Step 1: Prepare Test Data (Optional)

If you don't have stuck creatives, create test data:

```sql
-- Create a test creative stuck in SCANNING (older than 15 minutes)
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
  'test-stuck-' || substr(md5(random()::text), 1, 10),
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

**Run this SQL query to see stuck items:**

```sql
SELECT
  id,
  status,
  status_updated_at,
  scan_attempts,
  EXTRACT(EPOCH FROM (now() - status_updated_at))/60 as minutes_stuck
FROM creatives
WHERE status = 'SCANNING'
  AND status_updated_at < now() - interval '15 minutes'
ORDER BY status_updated_at ASC;
```

**Note down:**

- Number of stuck items
- Their IDs
- Oldest stuck timestamp

### Step 3: Click the Button

1. **Open Admin Dashboard:**
   - Navigate to `/dashboard` (as admin user)
   - Look for "System Operations" section

2. **Click "Reset Stuck Jobs":**
   - Button should be visible and enabled
   - Click the button

3. **Confirm Action:**
   - Dialog appears: "This will reset all jobs stuck in SCANNING for more than 15 minutes. Continue?"
   - Click "Continue"

4. **Observe UI:**
   - Button shows "Resetting..." with spinner
   - Button is disabled during request
   - Success message appears: "✅ X stuck jobs were reset to PENDING" or "ℹ️ No stuck jobs found"

### Step 4: Verify Database Changes

**Run this SQL query immediately after clicking:**

```sql
-- Check if items were reset to PENDING
SELECT
  id,
  status,
  status_updated_at,
  scan_attempts,
  last_scan_error,
  updated_at
FROM creatives
WHERE status = 'pending'
  AND last_scan_error LIKE '%Reset by admin%'
  AND updated_at >= now() - interval '5 minutes'
ORDER BY updated_at DESC;
```

**Expected Results:**

- ✅ Items have `status = 'pending'`
- ✅ `last_scan_error` contains "Reset by admin"
- ✅ `status_updated_at` and `updated_at` are recent (within last few minutes)
- ✅ `scan_attempts` incremented by 1

### Step 5: Verify Audit Logs

**Run this SQL query:**

```sql
-- Find the audit log entry
SELECT
  id,
  user_id,
  action,
  created_at,
  details->>'affectedAssetCount' as count,
  details->'affectedAssetIds' as ids,
  details->'triggeringUser' as admin_info
FROM audit_logs
WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
  AND created_at >= now() - interval '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**

- ✅ Audit log entry exists
- ✅ `user_id` matches your admin user ID
- ✅ `action` = `'RESET_STUCK_SCANNING_ASSETS'`
- ✅ `count` matches the number from UI
- ✅ `ids` array contains the reset creative IDs
- ✅ `admin_info` contains your user details

### Step 6: Verify System Processing (Wait 1-2 minutes)

**Run this query to see if items are being processed:**

```sql
-- Check if reset items are now being processed
SELECT
  c.id,
  c.status,
  c.status_updated_at,
  CASE
    WHEN c.status = 'pending' THEN 'Awaiting processing'
    WHEN c.status = 'SCANNING' THEN 'Currently processing'
    WHEN c.status = 'approved' THEN 'Completed'
    WHEN c.status = 'rejected' THEN 'Failed'
    ELSE c.status
  END as current_state
FROM creatives c
WHERE c.id IN (
  SELECT id FROM creatives
  WHERE status = 'pending'
    AND last_scan_error LIKE '%Reset by admin%'
    AND updated_at >= now() - interval '10 minutes'
)
ORDER BY c.status_updated_at DESC;
```

**Expected Results:**

- ✅ Items transition from `'pending'` to `'SCANNING'` (being picked up)
- ✅ Items eventually complete processing

---

## Automated Verification Script

### Run the Verification Script

```bash
# From project root
pnpm tsx scripts/verify-reset-stuck-jobs.ts
```

**What it does:**

- Checks for stuck creatives
- Verifies audit logs
- Confirms reset items
- Validates status changes
- Monitors processing status

**Output:**

- Summary of all verification steps
- Counts and IDs
- Any warnings or issues

---

## Manual Verification Checklist

Use this checklist during testing:

### Before Click

- [ ] Stuck creatives exist in database (status = 'SCANNING', > 15 min old)
- [ ] Count of stuck items recorded
- [ ] IDs of stuck items noted

### During Click

- [ ] Button visible and enabled
- [ ] Confirmation dialog appears
- [ ] Button shows "Resetting..." with spinner
- [ ] Button is disabled during request
- [ ] Success message appears with correct count

### After Click - Database

- [ ] Items changed from 'SCANNING' to 'pending'
- [ ] `status_updated_at` updated to current time
- [ ] `updated_at` updated to current time
- [ ] `scan_attempts` incremented by 1
- [ ] `last_scan_error` contains reset message
- [ ] Count matches UI message

### After Click - Audit Logs

- [ ] Audit log entry created
- [ ] `user_id` matches admin user
- [ ] `action` = 'RESET_STUCK_SCANNING_ASSETS'
- [ ] `created_at` is recent
- [ ] `affectedAssetCount` matches reset count
- [ ] `affectedAssetIds` contains correct IDs
- [ ] Admin user info present in details

### After Click - System Behavior

- [ ] Reset items transition to 'SCANNING' (being processed)
- [ ] Items eventually complete processing
- [ ] No items remain stuck indefinitely

---

## Troubleshooting

### Issue: No Items Reset

**Check:**

1. Verify items meet criteria: `status = 'SCANNING'` AND `status_updated_at < now() - 15 minutes`
2. Check database logs for errors
3. Verify endpoint was called (check Network tab)

### Issue: Audit Log Missing

**Check:**

1. Check application logs for audit insertion errors
2. Verify `audit_logs` table exists
3. Check database permissions

### Issue: Items Not Processing

**Check:**

1. Verify worker/queue processes are running
2. Check worker logs for errors
3. Verify queue configuration
4. Check if items meet processing criteria

### Issue: Count Mismatch

**Check:**

1. Verify database query matches endpoint logic
2. Check for race conditions
3. Verify transaction committed

---

## Quick SQL Queries Reference

### Find Stuck Items

```sql
SELECT id, status, status_updated_at
FROM creatives
WHERE status = 'SCANNING'
  AND status_updated_at < now() - interval '15 minutes';
```

### Find Reset Items

```sql
SELECT id, status, updated_at
FROM creatives
WHERE status = 'pending'
  AND last_scan_error LIKE '%Reset by admin%'
  AND updated_at >= now() - interval '10 minutes';
```

### Find Audit Log

```sql
SELECT * FROM audit_logs
WHERE action = 'RESET_STUCK_SCANNING_ASSETS'
  AND created_at >= now() - interval '10 minutes'
ORDER BY created_at DESC;
```

### Check Processing Status

```sql
SELECT id, status, status_updated_at
FROM creatives
WHERE id IN (/* reset item IDs */)
ORDER BY status_updated_at DESC;
```

---

## Success Criteria

✅ **All checks pass:**

- Database state changed correctly
- Audit logs created with complete info
- System processes resume picking up items
- UI matches database reality

✅ **No issues:**

- No stuck items remain
- No missing audit logs
- No processing failures
- No count mismatches

---

**Ready to test?** Follow the steps above and use the verification script for automated checks!
