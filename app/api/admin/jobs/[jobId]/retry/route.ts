import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/schema";
import { logJobEvent, JobEventType } from "@/lib/services/job-events.service";

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
        await db.update(backgroundJobs)
            .set({
                status: 'pending',
                nextRunAt: new Date(),
                errorType: null,
                error: null,
                attempt: 0,
            })
            .where(eq(backgroundJobs.id, jobId));

        await logJobEvent({
            jobId,
            type: 'manual_retry',
            message: 'Manual retry triggered by admin',
            data: { triggeredBy: session.user.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to retry job:", error);
        await logJobEvent({
            jobId,
            type: JobEventType.FAILED,
            message: "Manual retry failed: " + message,
        });
        return NextResponse.json(
            { error: "Failed to retry job" },
            { status: 500 }
        );
    }
}
