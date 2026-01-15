import { eq, sql, and, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { sendAlert } from "@/lib/alerts";
import { auth } from "@/lib/auth";
import { classifyJobError } from "@/lib/classifyJobError";
import { db } from "@/lib/db";
import { withJobContext } from "@/lib/logger";
import { backgroundJobs } from "@/lib/schema";
import { syncAdvertisersFromEverflow, syncOffersFromEverflow } from "@/lib/services/everflow-sync.service";
import { logJobEvent, JobEventType } from "@/lib/services/job-events.service";
import { getSystemState, setSystemState } from "@/lib/services/system-state";
import { type JobErrorType } from "@/types/jobError";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const retryPolicy: Record<JobErrorType, { delayMinutes?: number }> = {
    network: { delayMinutes: 1 },
    rate_limit: { delayMinutes: 10 },
    timeout: { delayMinutes: 2 },
    external_api: { delayMinutes: 5 },
    data_corruption: { delayMinutes: 0 },
    permission: { delayMinutes: 0 },
    system: { delayMinutes: 5 },
    unknown: { delayMinutes: 5 },
};


async function handleJobError(job: typeof backgroundJobs.$inferSelect, error: unknown, startTime: number, log: { error: (meta: unknown, msg: string) => void; info: (meta: unknown, msg: string) => void; warn: (meta: unknown, msg: string) => void }) {
    const classified = classifyJobError(error);
    const errorType = classified.type;
    const policy = retryPolicy[errorType];

    const currentRetryCount = job.retryCount || 0;
    const maxRetries = job.maxRetries || 5;
    const errorMessage = classified.message;
    const errorStack = error instanceof Error ? error.stack : undefined;
    const elapsed = Date.now() - startTime;

    log.error({ type: 'failed', error: errorMessage, stack: errorStack, errorType, severity: classified.severity }, 'Job failed');

    if (classified.retryable && currentRetryCount < maxRetries) {
        const baseDelayMinutes = policy?.delayMinutes || 1;
        const backoffMultiplier = Math.pow(2, currentRetryCount);
        const delayMinutes = baseDelayMinutes * backoffMultiplier;

        const jitter = delayMinutes * 0.1 * (Math.random() * 2 - 1);
        const finalDelayMinutes = Math.max(0.1, delayMinutes + jitter);

        const nextRun = new Date(Date.now() + finalDelayMinutes * 60_000);

        await db.transaction(async (tx) => {
            await tx
                .update(backgroundJobs)
                .set({
                    status: "pending",
                    retryCount: currentRetryCount + 1,
                    lastErrorAt: new Date(),
                    nextRunAt: nextRun,
                    error: errorMessage,
                    errorType,
                })
                .where(eq(backgroundJobs.id, job.id));

            log.warn({ jobId: job.id, retryCount: currentRetryCount + 1, errorType, nextRun }, 'Retry scheduled');

            await logJobEvent({
                jobId: job.id,
                type: 'retry_scheduled',
                message: `Retry scheduled in ${finalDelayMinutes.toFixed(2)} minutes (Attempt ${currentRetryCount + 1}/${maxRetries})`,
                data: { retryCount: currentRetryCount + 1, nextRunAt: nextRun, errorType, stack: errorStack },
                tx
            });
        });

        if (currentRetryCount === maxRetries - 1) {
            await sendAlert(`⚠️ Everflow sync retrying (${currentRetryCount + 1}/${maxRetries})\nJob: ${job.id}`);
        }

    } else {
        await db.transaction(async (tx) => {
            await tx
                .update(backgroundJobs)
                .set({
                    status: "dead",
                    deadLetteredAt: new Date(),
                    finishedAt: new Date(),
                    error: errorMessage,
                    errorType,
                    lastErrorAt: new Date(),
                })
                .where(eq(backgroundJobs.id, job.id));

            await logJobEvent({
                jobId: job.id,
                type: JobEventType.FAILED,
                message: "Moved to Dead Letter Queue: " + errorMessage,
                data: { stack: errorStack, elapsed, errorType, deadLetter: true, severity: classified.severity },
                tx
            });
        });

        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const [deadCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(backgroundJobs)
                .where(and(
                    eq(backgroundJobs.status, "dead"),
                    gte(backgroundJobs.deadLetteredAt, tenMinutesAgo)
                ));

            if (Number(deadCount.count) >= 10) {
                await setSystemState("jobQueuePaused", {
                    paused: true,
                    reason: "Too many dead jobs (>10) in last 10 minutes",
                    at: new Date().toISOString()
                });
                await sendAlert(`🚨 **CIRCUIT BREAKER TRIGGERED** 🚨\nJob Queue Paused automatically.\nReason: >10 dead jobs in 10 minutes.`);
            }
        } catch (err) {
            console.error("Failed to check failure spike", err);
        }
    }
}

const MAX_EXECUTION_TIME_MS = 240000;

export async function GET(req: Request) {
    const vercelCronHeader = req.headers.get("x-vercel-cron");
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const isAdmin = session?.user?.role === "admin";

    if (!isAdmin) {
        if (process.env.NODE_ENV === "production") {
            if (vercelCronHeader !== "1") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        } else {
            if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCronHeader !== "1") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }
    }

    const startTime = Date.now();

    const pausedState = await getSystemState<{ paused: boolean; reason: string }>("jobQueuePaused");
    if (pausedState?.paused) {
        console.warn("Job queue is paused:", pausedState.reason);
        return NextResponse.json({ message: "Job queue is paused", reason: pausedState.reason });
    }

    let processedCount = 0;

    try {
        while (Date.now() - startTime < MAX_EXECUTION_TIME_MS) {
            const lockedJob = await db.execute(sql`
                UPDATE background_jobs
                SET status = 'running', started_at = NOW()
                WHERE id = (
                    SELECT id
                    FROM background_jobs
                    WHERE status = 'pending'
                    AND (next_run_at IS NULL OR next_run_at <= NOW())
                    ORDER BY created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING *
            `);

            if (lockedJob.rows.length === 0) {
                break;
            }

            const job = lockedJob.rows[0] as typeof backgroundJobs.$inferSelect;
            processedCount++;

            const currentJobStatus = await db.query.backgroundJobs.findFirst({
                where: eq(backgroundJobs.id, job.id),
                columns: { status: true },
            });

            if (currentJobStatus?.status === "cancelled") {
                await logJobEvent({
                    jobId: job.id,
                    type: JobEventType.CANCELLED,
                    message: "Job cancelled by admin/system",
                });
                continue;
            }

            if (job.type === "everflow_sync") {
                const log = withJobContext(job.id);
                log.info({ type: 'started' }, 'Everflow sync started');
                await logJobEvent({
                    jobId: job.id,
                    type: JobEventType.STARTED,
                    message: "Everflow sync started",
                });
                await processEverflowSync(job, startTime, log);
            } else if (job.type === "everflow_advertiser_sync") {
                const log = withJobContext(job.id);
                log.info({ type: 'started' }, 'Everflow advertiser sync started');
                await logJobEvent({
                    jobId: job.id,
                    type: JobEventType.STARTED,
                    message: "Everflow advertiser sync started",
                });
                await processEverflowAdvertiserSync(job, startTime, log);
            } else {
                await db
                    .update(backgroundJobs)
                    .set({
                        status: "failed",
                        finishedAt: new Date(),
                        error: `Unknown job type: ${job.type}`,
                    })
                    .where(eq(backgroundJobs.id, job.id));

                await logJobEvent({
                    jobId: job.id,
                    type: JobEventType.FAILED,
                    message: `Unknown job type: ${job.type}`,
                });
            }
        }

        return NextResponse.json({
            message: "Worker run completed",
            processed: processedCount
        });
    } catch (error) {
        console.error("Worker error:", error);
        return NextResponse.json({ error: "Worker failed" }, { status: 500 });
    }
}

async function processEverflowSync(job: typeof backgroundJobs.$inferSelect, startTime: number, log: { error: (meta: unknown, msg: string) => void; info: (meta: unknown, msg: string) => void; warn: (meta: unknown, msg: string) => void }) {
    const payloadObj = job.payload && typeof job.payload === "object" ? job.payload as Record<string, unknown> : {};
    const userId = (payloadObj.userId as string) || "system";
    const filters = (payloadObj.filters as Record<string, unknown>) || {};
    const conflictResolution = (payloadObj.conflictResolution === "skip" || payloadObj.conflictResolution === "update" || payloadObj.conflictResolution === "merge")
        ? payloadObj.conflictResolution
        : "update";
    const RUNNING_THRESHOLD_MINUTES = 10;
    let longRunningAlertSent = false;

    try {
        await db
            .update(backgroundJobs)
            .set({ total: 0 })
            .where(eq(backgroundJobs.id, job.id));

        const syncResult = await syncOffersFromEverflow(userId, {
            conflictResolution,
            filters,
            dryRun: false,
            onProgress: async (progress) => {
                await db
                    .update(backgroundJobs)
                    .set({
                        progress: progress.current,
                        total: progress.total,
                    })
                    .where(eq(backgroundJobs.id, job.id));

                log.info({ type: 'progress', processed: progress.current, total: progress.total }, 'Progress update');

                await logJobEvent({
                    jobId: job.id,
                    type: JobEventType.PROGRESS,
                    data: { processed: progress.current, total: progress.total },
                });

                if (!longRunningAlertSent && Date.now() - startTime > RUNNING_THRESHOLD_MINUTES * 60_000) {
                    longRunningAlertSent = true;
                    await sendAlert(`⏳ Everflow sync running > ${RUNNING_THRESHOLD_MINUTES} minutes\nJob: ${job.id}`);
                }
            },
            onEvent: async (event) => {
                if (event.type === 'chunk_processed') {
                    log.info({
                        type: 'chunk_processed',
                        chunkNumber: event.data?.chunkNumber,
                        processed: event.data?.processed,
                        total: event.data?.total
                    }, 'Chunk processed');
                }

                await logJobEvent({
                    jobId: job.id,
                    type: event.type,
                    message: event.message,
                    data: event.data
                });
            }
        });

        await db.transaction(async (tx) => {
            await tx
                .update(backgroundJobs)
                .set({
                    status: "completed",
                    finishedAt: new Date(),
                    progress: syncResult.totalRecords,
                    total: syncResult.totalRecords,
                    result: {
                        syncedRecords: syncResult.syncedRecords,
                        createdRecords: syncResult.createdRecords,
                        updatedRecords: syncResult.updatedRecords,
                        skippedRecords: syncResult.skippedRecords,
                        failedRecords: syncResult.failedRecords,
                        errors: syncResult.errors,
                    },
                })
                .where(eq(backgroundJobs.id, job.id));

            log.info({
                type: 'completed',
                syncedRecords: syncResult.syncedRecords,
                createdRecords: syncResult.createdRecords,
                updatedRecords: syncResult.updatedRecords,
                skippedRecords: syncResult.skippedRecords,
                failedRecords: syncResult.failedRecords
            }, 'Everflow sync completed successfully');

            await logJobEvent({
                jobId: job.id,
                type: JobEventType.COMPLETED,
                message: "Everflow sync completed successfully",
                data: syncResult,
                tx
            });
        });


    } catch (error: unknown) {
        await handleJobError(job, error, startTime, log);
    }
}

async function processEverflowAdvertiserSync(job: typeof backgroundJobs.$inferSelect, startTime: number, log: { error: (meta: unknown, msg: string) => void; info: (meta: unknown, msg: string) => void; warn: (meta: unknown, msg: string) => void }) {
    const payloadObj = job.payload && typeof job.payload === "object" ? job.payload as Record<string, unknown> : {};
    const userId = (payloadObj.userId as string) || "system";
    const filters = (payloadObj.filters as Record<string, unknown>) || {};
    const conflictResolution = (payloadObj.conflictResolution === "skip" || payloadObj.conflictResolution === "update" || payloadObj.conflictResolution === "merge")
        ? payloadObj.conflictResolution
        : "update";
    const RUNNING_THRESHOLD_MINUTES = 10;
    let longRunningAlertSent = false;

    try {
        await db
            .update(backgroundJobs)
            .set({ total: 0 })
            .where(eq(backgroundJobs.id, job.id));

        const syncResult = await syncAdvertisersFromEverflow(userId, {
            conflictResolution,
            filters,
            dryRun: false,
            onProgress: async (progress) => {
                await db
                    .update(backgroundJobs)
                    .set({
                        progress: progress.current,
                        total: progress.total,
                    })
                    .where(eq(backgroundJobs.id, job.id));

                log.info({ type: 'progress', processed: progress.current, total: progress.total }, 'Progress update');

                await logJobEvent({
                    jobId: job.id,
                    type: JobEventType.PROGRESS,
                    data: { processed: progress.current, total: progress.total },
                });

                if (!longRunningAlertSent && Date.now() - startTime > RUNNING_THRESHOLD_MINUTES * 60_000) {
                    longRunningAlertSent = true;
                    await sendAlert(`⏳ Everflow advertiser sync running > ${RUNNING_THRESHOLD_MINUTES} minutes\nJob: ${job.id}`);
                }
            },
            onEvent: async (event) => {
                if (event.type === 'chunk_processed') {
                    log.info({
                        type: 'chunk_processed',
                        chunkNumber: event.data?.chunkNumber,
                        processed: event.data?.processed,
                        total: event.data?.total
                    }, 'Chunk processed');
                }

                await logJobEvent({
                    jobId: job.id,
                    type: event.type,
                    message: event.message,
                    data: event.data
                });
            }
        });

        await db.transaction(async (tx) => {
            await tx
                .update(backgroundJobs)
                .set({
                    status: "completed",
                    finishedAt: new Date(),
                    progress: syncResult.totalRecords,
                    total: syncResult.totalRecords,
                    result: {
                        syncedRecords: syncResult.syncedRecords,
                        createdRecords: syncResult.createdRecords,
                        updatedRecords: syncResult.updatedRecords,
                        skippedRecords: syncResult.skippedRecords,
                        failedRecords: syncResult.failedRecords,
                        errors: syncResult.errors,
                    },
                })
                .where(eq(backgroundJobs.id, job.id));

            log.info({
                type: 'completed',
                syncedRecords: syncResult.syncedRecords,
                createdRecords: syncResult.createdRecords,
                updatedRecords: syncResult.updatedRecords,
                skippedRecords: syncResult.skippedRecords,
                failedRecords: syncResult.failedRecords
            }, 'Everflow advertiser sync completed successfully');

            await logJobEvent({
                jobId: job.id,
                type: JobEventType.COMPLETED,
                message: "Everflow advertiser sync completed successfully",
                data: syncResult,
                tx
            });
        });

    } catch (error: unknown) {
        await handleJobError(job, error, startTime, log);
    }
}

