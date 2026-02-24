import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-utils";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assetsTable } from "@/lib/schema";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const assets = await db
      .select({
        id: assetsTable.id,
        publisherId: assetsTable.publisherId,
        status: assetsTable.status,
        createdAt: assetsTable.createdAt,
        approvedAt: assetsTable.approvedAt,
      })
      .from(assetsTable)
      .where(status ? eq(assetsTable.status, status) : undefined)
      .limit(limit)
      .orderBy(desc(assetsTable.createdAt));

    return NextResponse.json({
      success: true,
      data: assets.map((asset) => ({
        id: asset.id,
        publisherId: asset.publisherId,
        status: asset.status,
        createdAt: asset.createdAt.toISOString(),
        approvedAt: asset.approvedAt?.toISOString() ?? null,
      })),
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
