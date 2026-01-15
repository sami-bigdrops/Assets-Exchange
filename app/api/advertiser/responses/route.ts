import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getAdvertiserResponses } from "@/features/advertiser/services/response.service";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || session.user.role !== "advertiser") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const advertiserId = session.user.id;

    try {
        const { searchParams } = new URL(req.url);

        const page = Number(searchParams.get("page") ?? 1);
        const limit = Number(searchParams.get("limit") ?? 20);
        const status = searchParams.get("status")?.split(",");
        const search = searchParams.get("search") ?? undefined;

        const result = await getAdvertiserResponses({
            advertiserId,
            page,
            limit,
            status,
            search,
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("Get advertiser responses error:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
