import { lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { idempotencyKeys } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
    try {
        const result = await db
            .delete(idempotencyKeys)
            .where(lt(idempotencyKeys.expiresAt, new Date()))
            .returning();

        return NextResponse.json({
            message: "Idempotency keys cleaned up",
            deletedCount: result.length
        });
    } catch (error) {
        console.error("Failed to cleanup idempotency keys", error);
        return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }
}
