import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { backgroundJobs } from "@/lib/schema";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { jobId } = await params;
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const originalJob = await db.query.backgroundJobs.findFirst({
            where: eq(backgroundJobs.id, jobId),
        });

        if (!originalJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        const MAX_REPLAYS = 3;
        const WINDOW_MS = 5 * 60 * 1000; 
        const now = Date.now();

        if (
            originalJob.replayCount >= MAX_REPLAYS &&
            originalJob.lastReplayAt &&
            now - new Date(originalJob.lastReplayAt).getTime() < WINDOW_MS
        ) {
            return NextResponse.json(
                { error: "Replay limit exceeded. Please wait 5 minutes before retrying." },
                { status: 429 }
            );
        }

        const newPayload = {
            ...(originalJob.payload as Record<string, unknown>),
            userId: session.user.id,
            replayFromJobId: originalJob.id,
            replayedAt: new Date().toISOString(),
            replayedBy: session.user.id,
        };

        const [newJob] = await db.transaction(async (tx) => {
            const [job] = await tx
                .insert(backgroundJobs)
                .values({
                    type: originalJob.type,
                    status: "pending",
                    payload: newPayload,
                    progress: 0,
                    total: 0,
                })
                .returning({ id: backgroundJobs.id });

            await tx
                .update(backgroundJobs)
                .set({
                    replayCount: (originalJob.replayCount || 0) + 1,
                    lastReplayAt: new Date(),
                })
                .where(eq(backgroundJobs.id, jobId));

            return [job];
        });

        logger.info({
            type: 'job_replayed',
            originalJobId: jobId,
            newJobId: newJob.id,
            userId: session.user.id
        }, "Job replayed manually");

        fetch(`${new URL(req.url).origin}/api/cron/process-jobs`)
            .catch(err => console.error("Failed to trigger worker", err));

        return NextResponse.json({ success: true, newJobId: newJob.id }, { status: 201 });

    } catch (error: unknown) {
        console.error("Replay error:", error);
        return NextResponse.json(
            { error: "Failed to replay job" },
            { status: 500 }
        );
    }
}
