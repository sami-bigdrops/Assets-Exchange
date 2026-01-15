import { eq, asc } from "drizzle-orm"
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db"
import { requestStatusHistory } from "@/lib/schema"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const rows = await db
            .select()
            .from(requestStatusHistory)
            .where(eq(requestStatusHistory.requestId, id))
            .orderBy(asc(requestStatusHistory.createdAt));

        return NextResponse.json(rows);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("Fetch history error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
