import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminRequestById } from "@/features/admin/services/request.service";
import { auth } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const row = await getAdminRequestById(id);

        if (!row) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json(row);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("Get request detail error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
