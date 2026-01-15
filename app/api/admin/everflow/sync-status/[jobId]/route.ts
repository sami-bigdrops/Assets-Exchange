
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/schema";


export async function GET(
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
        const job = await db.query.backgroundJobs.findFirst({
            where: eq(backgroundJobs.id, jobId),
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json({
            status: job.status,
            progress: job.progress,
            total: job.total,
            error: job.error,
            errorType: job.errorType,
            result: job.result,
            finishedAt: job.finishedAt,
            attempt: job.attempt,
            maxAttempts: job.maxAttempts,
            nextRunAt: job.nextRunAt,
        });
    } catch (error) {
        console.error("Failed to get job status:", error);
        return NextResponse.json(
            { error: "Failed to get job status" },
            { status: 500 }
        );
    }
}
