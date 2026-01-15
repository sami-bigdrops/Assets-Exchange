import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { sendAlert } from "@/lib/alerts";
import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const vercelCronHeader = req.headers.get("x-vercel-cron");
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production") {
        if (vercelCronHeader !== "1") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    } else {
        if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCronHeader !== "1") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const lastSuccess = await db
            .select()
            .from(backgroundJobs)
            .where(eq(backgroundJobs.status, 'completed'))
            .orderBy(desc(backgroundJobs.finishedAt))
            .limit(1);

        if (!lastSuccess.length || (lastSuccess[0].finishedAt && Date.now() - new Date(lastSuccess[0].finishedAt).getTime() > 6 * 60 * 60_000)) {
            await sendAlert('⚠️ No Everflow sync completed in the last 6 hours');
            return NextResponse.json({ status: "alert_sent", message: "No recent sync found" });
        }

        return NextResponse.json({ status: "ok", lastSuccess: lastSuccess[0]?.finishedAt });
    } catch (error) {
        console.error("Health check failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
