import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { listPublishers, createPublisher } from "@/features/admin/services/publisher.service";
import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";
import { createPublisherSchema } from "@/lib/validations/admin";

async function enforceRateLimit() {
    const key = await getRateLimitKey();
    const { success } = await ratelimit.limit(key);
    if (!success) {
        return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }
}

export async function GET(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") as "Active" | "Inactive" | undefined;
    const platform = searchParams.get("platform") || undefined;
    const createdMethod = searchParams.get("createdMethod") as "Manually" | "API" | undefined;
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || undefined;

    try {
        const result = await listPublishers({
            search,
            page,
            limit,
            status,
            platform,
            createdMethod,
            sortBy,
            sortOrder
        });
        return NextResponse.json(result);
    } catch (err: unknown) {
        return handleApiError(err);
    }
}

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const rl = await enforceRateLimit();
        if (rl) return rl;

        const body = await req.json();
        const parsed = createPublisherSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const row = await createPublisher(parsed.data);
        return NextResponse.json(row, { status: 201 });
    } catch (err: unknown) {
        return handleApiError(err);
    }
}
