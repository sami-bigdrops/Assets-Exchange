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
        const jobs = await db
            .select()
            .from(backgroundJobs)
            .where(eq(backgroundJobs.id, jobId))
            .limit(1);

        if (jobs.length === 0) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json(jobs[0]);
    } catch (error) {
        console.error("Failed to fetch job:", error);
        return NextResponse.json(
            { error: "Failed to fetch job" },
            { status: 500 }
        );
    }
}
