
import { eq, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { backgroundJobEvents } from "@/lib/schema";


export async function GET(
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
        const events = await db
            .select()
            .from(backgroundJobEvents)
            .where(eq(backgroundJobEvents.jobId, jobId))
            .orderBy(asc(backgroundJobEvents.createdAt));

        return NextResponse.json(events);
    } catch (error) {
        console.error("Failed to fetch job events:", error);
        return NextResponse.json(
            { error: "Failed to fetch job events" },
            { status: 500 }
        );
    }
}
