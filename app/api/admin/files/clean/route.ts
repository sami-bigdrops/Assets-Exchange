import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { fileUploads } from "@/lib/schema";
import { auth } from "@/lib/auth";

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function GET() {
    try {
        await requireAdmin();

        const cleanFiles = await db
            .select()
            .from(fileUploads)
            .where(
                and(
                    eq(fileUploads.status, "clean"),
                    isNull(fileUploads.deletedAt)
                )
            )
            .orderBy(fileUploads.createdAt);

        return NextResponse.json({
            success: true,
            data: cleanFiles,
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal server error";
        if (message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
