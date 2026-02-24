# PENDING Asset Reprocessing System Behavior

## Overview

When assets revert to `PENDING` status (e.g., via admin reset from `SCANNING`), the background processing system must automatically detect and reprocess these assets without requiring UI intervention. This document describes the required behavior of all background processing components.

## System Architecture

The reprocessing pipeline relies on three key components:

1. **Cron Job Worker** (`/api/cron/process-jobs`) - Runs every minute, processes background jobs
2. **Background Job Queue** (`background_jobs` table) - Stores pending scan jobs
3. **Asset Scanner** - Processes creative assets and updates their status

## Required Behavior

### 1. Cron Job Worker (`/api/cron/process-jobs`)

**Current Behavior:**

- Runs every 1 minute (configured in `vercel.json`)
- Processes `background_jobs` with `status = 'pending'` and `next_run_at <= NOW()`
- Uses `FOR UPDATE SKIP LOCKED` for concurrent safety

**Required Enhancement for PENDING Assets:**

The worker should include a new job type handler for creative asset scanning:

```typescript
// In process-jobs/route.ts
if (job.type === "everflow_sync") {
  // ... existing logic
} else if (job.type === "everflow_advertiser_sync") {
  // ... existing logic
} else if (job.type === "creative_scan") {
  const log = withJobContext(job.id);
  log.info({}, "Creative scan started");
  await logJobEvent({
    jobId: job.id,
    type: JobEventType.STARTED,
    message: "Creative scan started",
  });
  await processCreativeScan(job, startTime, log);
} else {
  // ... unknown job type handling
}
```

**Key Requirements:**

- Process `creative_scan` job type
- Update creative status: `PENDING` → `SCANNING` → `completed`/`failed`
- Use existing retry mechanism for scan failures
- Respect `scanAttempts` counter and retry limits

### 2. Asset Discovery Cron Job (NEW)

**Purpose:** Periodically discover assets in `PENDING` status that need scanning

**Implementation:**

- Create new cron endpoint: `/api/cron/discover-pending-creatives`
- Schedule: Every 2-5 minutes (less frequent than job processor)
- Query: Find creatives where `status = 'pending'` and no active scan job exists

**Query Logic:**

```sql
SELECT c.id, c.status, c.scan_attempts, c.status_updated_at
FROM creatives c
WHERE c.status = 'pending'
  AND c.status_updated_at > NOW() - INTERVAL '24 hours'  -- Only recent assets
  AND NOT EXISTS (
    SELECT 1 FROM background_jobs bj
    WHERE bj.type = 'creative_scan'
      AND bj.payload->>'creativeId' = c.id
      AND bj.status IN ('pending', 'running')
  )
ORDER BY c.status_updated_at ASC
LIMIT 100  -- Batch size
```

**Behavior:**

1. Discover pending creatives without active scan jobs
2. For each creative, enqueue a `creative_scan` background job
3. Set job payload: `{ creativeId: string, url: string, type: string }`
4. Set initial `next_run_at` to `NOW()` for immediate processing
5. Log discovery metrics

**Safety Constraints:**

- Only discover assets updated within last 24 hours (prevents reprocessing old data)
- Skip assets that already have active scan jobs
- Respect batch limits to avoid overwhelming the queue
- Idempotent: Multiple runs should not create duplicate jobs

### 3. Background Job Queue Behavior

**Job Creation:**
When a creative asset is reset to `PENDING`:

- The reset endpoint should **NOT** create scan jobs directly (avoids UI logic)
- Instead, rely on the discovery cron job to detect and enqueue

**Job Processing:**
When `creative_scan` job is processed:

1. **Status Transition:**

   ```typescript
   // Update creative status to SCANNING
   await updateCreativeStatus(creativeId, {
     status: "SCANNING",
   });
   ```

2. **Perform Scan:**
   - Fetch creative metadata (url, type, format)
   - Execute malware/content scan
   - Handle scan result

3. **Status Update on Success:**

   ```typescript
   await updateCreativeStatus(creativeId, {
     status: "completed", // or appropriate success status
   });
   ```

4. **Status Update on Failure:**
   ```typescript
   await updateCreativeStatus(creativeId, {
     status: "failed", // or revert to 'pending' for retry
     scanError: error.message,
   });
   ```

**Retry Mechanism:**

- Use existing retry policy from `process-jobs/route.ts`
- Respect `scanAttempts` counter (incremented when status becomes `SCANNING`)
- Apply exponential backoff with jitter
- After max retries, mark job as `dead` and leave creative in `pending` status

### 4. Scanner Service Behavior

**Required Function: `processCreativeScan`**

```typescript
async function processCreativeScan(
  job: typeof backgroundJobs.$inferSelect,
  startTime: number,
  log: Logger
) {
  const { creativeId, url, type } = job.payload as {
    creativeId: string;
    url: string;
    type: string;
  };

  try {
    // 1. Verify creative is still in PENDING status
    const creative = await db.query.creatives.findFirst({
      where: eq(creatives.id, creativeId),
      columns: { id: true, status: true, scanAttempts: true },
    });

    if (!creative) {
      throw new Error(`Creative ${creativeId} not found`);
    }

    // 2. Skip if already processed (race condition protection)
    if (creative.status !== "pending" && creative.status !== "SCANNING") {
      log.info(
        {},
        `Creative ${creativeId} already processed, status: ${creative.status}`
      );
      await markJobCompleted(job.id);
      return;
    }

    // 3. Update status to SCANNING (triggers scanAttempts increment)
    await updateCreativeStatus(creativeId, {
      status: "SCANNING",
    });

    // 4. Perform actual scan
    const scanResult = await performMalwareScan(url, type);

    // 5. Update status based on result
    if (scanResult.clean) {
      await updateCreativeStatus(creativeId, {
        status: "completed", // or 'approved', depending on workflow
      });
    } else {
      await updateCreativeStatus(creativeId, {
        status: "failed",
        scanError: scanResult.error || "Malware detected",
      });
      // Optionally: revert to 'pending' for retry instead of 'failed'
    }

    // 6. Mark job as completed
    await markJobCompleted(job.id);
  } catch (error) {
    // Error handling uses existing retry mechanism
    await handleJobError(job, error, startTime, log);

    // Revert creative status to PENDING for retry
    await updateCreativeStatus(creativeId, {
      status: "pending",
      scanError: error instanceof Error ? error.message : String(error),
    });
  }
}
```

**Key Requirements:**

- Idempotent: Multiple job executions should not cause duplicate processing
- Status verification: Check current status before processing
- Atomic status updates: Use `updateCreativeStatus` service for consistency
- Error handling: Revert to `PENDING` on failure to allow retry

### 5. Retry Policy for Creative Scans

**Configuration:**

```typescript
const creativeScanRetryPolicy: Record<JobErrorType, { delayMinutes?: number }> =
  {
    network: { delayMinutes: 2 }, // Network issues: retry after 2 min
    rate_limit: { delayMinutes: 10 }, // Rate limits: retry after 10 min
    timeout: { delayMinutes: 5 }, // Timeouts: retry after 5 min
    external_api: { delayMinutes: 5 }, // External API failures: 5 min
    data_corruption: { delayMinutes: 0 }, // Data issues: no retry
    permission: { delayMinutes: 0 }, // Permission issues: no retry
    system: { delayMinutes: 5 }, // System errors: 5 min
    unknown: { delayMinutes: 5 }, // Unknown errors: 5 min
  };
```

**Retry Behavior:**

- Max retries: 5 attempts (configurable per job)
- Exponential backoff: `delayMinutes * 2^retryCount`
- Jitter: ±10% to prevent thundering herd
- After max retries: Job moves to `dead` status, creative remains `pending`

### 6. Status Transition Rules

**Allowed Transitions:**

- `pending` → `SCANNING` (when scan job starts)
- `SCANNING` → `completed` (scan successful)
- `SCANNING` → `failed` (scan failed, no retry)
- `SCANNING` → `pending` (scan failed, will retry)

**When Admin Resets to PENDING:**

- Status: `SCANNING` → `pending`
- `statusUpdatedAt`: Updated to current timestamp
- `scanAttempts`: Incremented (or reset, depending on options)
- `lastScanError`: Set to reset reason
- **No scan job created** - discovery cron will pick it up

**Automatic Reprocessing:**

- Discovery cron finds `pending` assets
- Enqueues `creative_scan` job
- Job processor picks up job
- Scanner processes asset
- Status transitions follow normal flow

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Add `creative_scan` job type handler to `/api/cron/process-jobs/route.ts`
- [ ] Implement `processCreativeScan` function
- [ ] Integrate with existing retry mechanism
- [ ] Add job completion/error handling

### Phase 2: Discovery Mechanism

- [ ] Create `/api/cron/discover-pending-creatives` endpoint
- [ ] Implement discovery query (finds pending assets without active jobs)
- [ ] Add job enqueueing logic
- [ ] Configure cron schedule in `vercel.json` (every 2-5 minutes)
- [ ] Add discovery metrics logging

### Phase 3: Scanner Integration

- [ ] Implement `performMalwareScan` function (or integrate existing scanner)
- [ ] Add status transition logic
- [ ] Implement idempotency checks
- [ ] Add error handling and status reversion

### Phase 4: Testing & Validation

- [ ] Test discovery cron with pending assets
- [ ] Test job processing with various scan outcomes
- [ ] Test retry mechanism with failures
- [ ] Test concurrent job processing
- [ ] Validate status transitions
- [ ] Test admin reset → automatic reprocessing flow

## Monitoring & Observability

**Key Metrics:**

- Number of pending assets discovered per cron run
- Number of scan jobs enqueued
- Scan job success/failure rates
- Average time from `pending` → `completed`
- Retry counts and patterns
- Dead letter queue size

**Logging:**

- Discovery cron: Log assets found, jobs created
- Job processor: Log job start, completion, failures
- Scanner: Log scan initiation, results, errors
- Status transitions: Log all status changes with timestamps

**Alerts:**

- High number of pending assets (>100)
- High scan failure rate (>10%)
- Jobs stuck in `running` status >15 minutes
- Discovery cron not running

## Benefits of This Approach

1. **No UI Logic:** All processing happens in background, no frontend changes needed
2. **Leverages Existing Infrastructure:** Uses existing job queue and retry mechanisms
3. **Resilient:** Automatic retry with exponential backoff
4. **Scalable:** Batch processing with configurable limits
5. **Observable:** Comprehensive logging and metrics
6. **Idempotent:** Safe to run multiple times
7. **Separation of Concerns:** Discovery, queuing, and processing are separate

## Example Flow

```
1. Admin resets asset: SCANNING → pending
   - Asset: { id: 'abc123', status: 'pending', statusUpdatedAt: '2024-01-15 10:00:00' }

2. Discovery cron runs (2 minutes later)
   - Finds asset 'abc123' in pending status
   - Creates background_job: { type: 'creative_scan', payload: { creativeId: 'abc123', ... }, status: 'pending' }

3. Job processor runs (1 minute later)
   - Picks up creative_scan job
   - Calls processCreativeScan()
   - Updates asset: pending → SCANNING
   - Performs scan

4. Scan completes successfully
   - Updates asset: SCANNING → completed
   - Marks job as completed

5. If scan fails
   - Updates asset: SCANNING → pending (with error)
   - Job retry scheduled (exponential backoff)
   - Process repeats from step 3
```

## Conclusion

This design ensures that assets reverting to `PENDING` status are automatically reprocessed through the existing background job infrastructure, without requiring any UI logic or manual intervention. The system is resilient, observable, and leverages existing retry mechanisms for reliability.
