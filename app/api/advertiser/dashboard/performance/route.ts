import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "advertiser") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const comparisonType =
    searchParams.get("comparisonType") || "Today vs Yesterday";

  return NextResponse.json({
    success: true,
    data: {
      comparisonType,
      xAxisLabel: "",
      data: [],
    },
  });
}
