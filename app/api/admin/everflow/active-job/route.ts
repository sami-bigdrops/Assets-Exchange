
import { desc, eq, and, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/schema";

export async function GET(req: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "everflow_sync";
        const userId = session.user.id;

        const job = await db.query.backgroundJobs.findFirst({
            where: and(
                eq(backgroundJobs.type, type),
                or(
                    eq(backgroundJobs.status, "pending"),
                    eq(backgroundJobs.status, "running")
                ),
                sql`payload->>'userId' = ${userId}`
            ),
            orderBy: [desc(backgroundJobs.createdAt)],
        });

        if (!job) {
            return NextResponse.json({ active: false });
        }

        return NextResponse.json({
            active: true,
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            total: job.total
        });

    } catch (error) {
        console.error("Failed to get active job:", error);
        return NextResponse.json(
            { error: "Failed to get active job" },
            { status: 500 }
        );
    }
}
