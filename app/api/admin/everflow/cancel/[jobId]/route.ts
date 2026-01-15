
import { eq, inArray, and } from "drizzle-orm";
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
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    try {
        const [updatedJob] = await db
            .update(backgroundJobs)
            .set({
                status: "cancelled",
                finishedAt: new Date(),
                error: "Cancelled by user",
            })
            .where(
                and(
                    eq(backgroundJobs.id, jobId),
                    inArray(backgroundJobs.status, ["pending", "running"])
                )
            )
            .returning();

        if (updatedJob) {
            logger.everflow.warn({
                type: 'job_cancelled',
                jobId,
                route: '/api/admin/everflow/cancel',
                userId: session.user.id
            }, 'Job cancelled via API');
        }

        if (!updatedJob) {
            const job = await db.query.backgroundJobs.findFirst({
                where: eq(backgroundJobs.id, jobId),
            });

            if (!job) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            } else {
                return NextResponse.json({
                    message: "Job already finished or cancelled",
                    status: job.status,
                });
            }
        }

        return NextResponse.json({ success: true, job: updatedJob });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.everflow.error({
            type: 'job_cancellation_failed',
            route: '/api/admin/everflow/cancel',
            jobId,
            error: message
        }, "Failed to cancel job");

        return NextResponse.json(
            { error: "Failed to cancel job" },
            { status: 500 }
        );
    }
}
