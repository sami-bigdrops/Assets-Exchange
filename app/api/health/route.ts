import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { withRequestContext } from "@/lib/requestContext";

export async function GET() {
    return withRequestContext(async () => {
        const dbOk = await db.execute(sql`SELECT 1`).then(() => true).catch(() => false);
        const redisOk = await redis.ping().then(() => true).catch(() => false);

        return NextResponse.json({
            status: "ok",
            db: dbOk ? "ok" : "down",
            redis: redisOk ? "ok" : "down",
            uptime: process.uptime(),
        });
    });
}
