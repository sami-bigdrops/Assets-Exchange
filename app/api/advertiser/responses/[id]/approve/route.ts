import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { approveResponse } from "@/features/advertiser/services/response.service";
import { auth } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "advertiser") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        await approveResponse(id, session.user.id);
        return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("Approve response error:", error);
        if (message === "Request not found") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (message === "Invalid state transition") {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
