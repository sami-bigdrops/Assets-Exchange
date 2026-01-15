import { createHash } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { idempotencyKeys } from "@/lib/schema";

export type IdempotencyResult = {
    status: "hit" | "miss" | "conflict";
    response?: {
        status: number;
        body: unknown;
    };
};

export async function checkIdempotency(key: string, request: Request): Promise<IdempotencyResult> {
    const bodyText = await request.clone().text();
    const hashInput = `${request.method}:${request.url}:${bodyText}`;
    const requestHash = createHash("sha256").update(hashInput).digest("hex");

    const existing = await db.query.idempotencyKeys.findFirst({
        where: eq(idempotencyKeys.id, key),
    });

    if (existing) {
        if (existing.requestHash !== requestHash) {
            return { status: "conflict" };
        }

        if (new Date() > existing.expiresAt) {

            return { status: "miss" };
        }

        return {
            status: "hit",
            response: {
                status: existing.responseStatus || 200,
                body: existing.responseBody,
            },
        };
    }

    return { status: "miss" };
}

export async function storeIdempotencyResponse(key: string, request: Request, status: number, body: unknown, ttlSeconds = 86400) {
    const bodyText = await request.clone().text();
    const hashInput = `${request.method}:${request.url}:${bodyText}`;
    const requestHash = createHash("sha256").update(hashInput).digest("hex");
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await db
        .insert(idempotencyKeys)
        .values({
            id: key,
            requestHash,
            responseStatus: status,
            responseBody: body,
            expiresAt,
        })
        .onConflictDoUpdate({
            target: idempotencyKeys.id,
            set: {
                requestHash,
                responseStatus: status,
                responseBody: body,
                expiresAt,
                createdAt: new Date(),
            },
        });
}
