
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { backgroundJobs } from "@/lib/schema";

export async function POST(req: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));

        const [job] = await db
            .insert(backgroundJobs)
            .values({
                type: "everflow_advertiser_sync",
                status: "pending",
                payload: {
                    userId: session.user.id,
                    conflictResolution: body.conflictResolution || "update",
                    filters: body.filters || { status: "active" },
                },
                progress: 0,
                total: 0,
            })
            .returning({ id: backgroundJobs.id });

        logger.everflow.info(`Everflow advertiser sync job created - jobId: ${job.id}, route: /api/admin/everflow/advertisers/sync, userId: ${session.user.id}`);

        const cronSecret = process.env.CRON_SECRET;
        const headers: HeadersInit = {};
        if (cronSecret) {
            headers["Authorization"] = `Bearer ${cronSecret}`;
        }
        
        fetch(`${new URL(req.url).origin}/api/cron/process-jobs`, {
            method: "GET",
            headers,
        }).catch(err => console.error("Failed to trigger worker", err));

        return NextResponse.json({ jobId: job.id });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.everflow.error(`Failed to start sync job - route: /api/admin/everflow/advertisers/sync, error: ${message}`);

        return NextResponse.json(
            { error: "Failed to start sync job" },
            { status: 500 }
        );
    }
}
