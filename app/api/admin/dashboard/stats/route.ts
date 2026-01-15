import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { getDashboardStats } from "@/features/admin/services/dashboard.service"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const stats = await getDashboardStats()
        return NextResponse.json(stats)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Dashboard stats error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
