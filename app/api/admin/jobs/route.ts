import { desc, and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withRequestContext } from "@/lib/requestContext";
import { backgroundJobs } from "@/lib/schema";

export async function GET(req: Request) {
    return withRequestContext(async () => {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const type = searchParams.get("type");

        try {
            const whereConditions = and(
                status ? eq(backgroundJobs.status, status) : undefined,
                type ? eq(backgroundJobs.type, type) : undefined
            );

            const jobs = await db
                .select()
                .from(backgroundJobs)
                .where(whereConditions)
                .orderBy(desc(backgroundJobs.createdAt))
                .limit(100);

            logger.info({
                action: "jobs.list",
                actorId: session.user.id,
                count: jobs.length,
            });

            return NextResponse.json(jobs);
        } catch (error) {
            logger.error({
                action: "jobs.list",
                error: error instanceof Error ? error.message : "Unknown error",
            });
            return NextResponse.json(
                { error: "Failed to fetch jobs" },
                { status: 500 }
            );
        }
    });
}
