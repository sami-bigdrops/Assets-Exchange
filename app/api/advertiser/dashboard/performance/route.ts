import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDashboardPerformance } from "@/features/advertiser/services/dashboard.service";
import { auth } from "@/lib/auth";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  comparisonType: z.enum([
    "Today vs Yesterday",
    "Today vs Last Week",
    "Current Week vs Last Week",
    "Current Month vs Last Month",
  ] as const),
  metric: z
    .enum([
      "Total Assets",
      "New Requests",
      "Approved Assets",
      "Rejected Assets",
      "Pending Approval",
    ] as const)
    .optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "advertiser") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const comparisonType =
      searchParams.get("comparisonType") || "Today vs Yesterday";
    const metric = searchParams.get("metric") || "Total Assets";

    const parsedParams = querySchema.parse({ comparisonType, metric });

    const data = await getDashboardPerformance(parsedParams, session.user.id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Dashboard performance API error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
