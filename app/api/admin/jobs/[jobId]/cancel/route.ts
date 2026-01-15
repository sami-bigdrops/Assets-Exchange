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
                status: 'cancelled',
                finishedAt: new Date(),
                error: 'Cancelled by admin from UI'
            })
            .where(eq(backgroundJobs.id, jobId));

        await logJobEvent({
            jobId,
            type: JobEventType.CANCELLED,
            message: 'Cancelled from admin UI',
            data: { cancelledBy: session.user.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to cancel job:", error);
        return NextResponse.json(
            { error: "Failed to cancel job" },
            { status: 500 }
        );
    }
}
