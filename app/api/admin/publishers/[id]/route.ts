import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getPublisher, updatePublisher, softDeletePublisher } from "@/features/admin/services/publisher.service";
import { auth } from "@/lib/auth";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";

async function enforceRateLimit() {
    const key = await getRateLimitKey();
    const { success } = await ratelimit.limit(key);
    if (!success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
}

async function checkAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "admin") return false;
    return true;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const row = await getPublisher(id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const rl = await enforceRateLimit();
        if (rl) return rl;

        const { id } = await params;
        const body = await req.json();
        const row = await updatePublisher(id, body);
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(row);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const rl = await enforceRateLimit();
        if (rl) return rl;

        const { id } = await params;
        await softDeletePublisher(id);
        return new NextResponse(null, { status: 204 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
