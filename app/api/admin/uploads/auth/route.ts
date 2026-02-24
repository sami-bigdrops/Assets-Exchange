import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { logger } from "@/lib/logger";
import { ratelimit } from "@/lib/ratelimit";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/security/route";

async function enforceRateLimit() {
    const key = await getRateLimitKey();
    const { success } = await ratelimit.limit(key);
    if (!success) {
        return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }
}

export async function POST(request: Request) {
    const rateLimitResult = await enforceRateLimit();
    if (rateLimitResult) return rateLimitResult;

    const body = (await request.json()) as HandleUploadBody;

    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (_pathname) => {
                return {
                    allowedContentTypes: ALLOWED_MIME_TYPES,
                    maximumSizeInBytes: MAX_FILE_SIZE,
                    tokenPayload: JSON.stringify({
                        userId: session.user.id,
                        email: session.user.email,
                        role: session.user.role,
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                logger.info({
                    action: "file.upload.completed",
                    userId: session.user.id,
                    blobUrl: blob.url,
                    tokenPayload,
                });
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
