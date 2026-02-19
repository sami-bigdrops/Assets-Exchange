import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getPublisher, updatePublisher, softDeletePublisher } from "@/features/admin/services/publisher.service";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";
import { updatePublisherSchema } from "@/lib/validations/admin";

async function enforceRateLimit() {
    const key = await getRateLimitKey();
    const { success } = await ratelimit.limit(key);
    if (!success) {
        return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }
}

async function checkAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user.role === "admin";
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const row = await getPublisher(params.id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const rl = await enforceRateLimit();
        if (rl) return rl;

        const body = await req.json();
        const parsed = updatePublisherSchema.safeParse({ ...body, id: params.id });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const row = await updatePublisher(params.id, parsed.data);
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(row);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const rl = await enforceRateLimit();
        if (rl) return rl;

        await softDeletePublisher(params.id);
        return new NextResponse(null, { status: 204 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
