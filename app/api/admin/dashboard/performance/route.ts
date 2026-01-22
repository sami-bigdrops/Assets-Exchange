import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { router } from "@/lib/rpc/router";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const comparisonType = searchParams.get("comparisonType") as
      | "Today vs Yesterday"
      | "Today vs Last Week"
      | "Current Week vs Last Week"
      | "Current Month vs Last Month"
      | null;
    const metric = (searchParams.get("metric") as
      | "Total Assets"
      | "New Requests"
      | "Approved Assets"
      | "Rejected Assets"
      | "Pending Approval"
      | null) || "Total Assets";

    if (!comparisonType) {
      return NextResponse.json(
        { error: "comparisonType parameter is required" },
        { status: 400 }
      );
    }

    const validComparisonTypes = [
      "Today vs Yesterday",
      "Today vs Last Week",
      "Current Week vs Last Week",
      "Current Month vs Last Month",
    ];

    if (!validComparisonTypes.includes(comparisonType)) {
      return NextResponse.json(
        { error: "Invalid comparisonType" },
        { status: 400 }
      );
    }

    const validMetrics = [
      "Total Assets",
      "New Requests",
      "Approved Assets",
      "Rejected Assets",
      "Pending Approval",
    ];

    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: "Invalid metric" },
        { status: 400 }
      );
    }

    // Call the RPC handler directly
    const procedure = router.admin.dashboard.performance;
    const procedureAny = procedure as {
      "~orpc"?: { handler?: (opts: { input: unknown }) => Promise<unknown> };
    };

    if (!procedureAny["~orpc"] || !procedureAny["~orpc"].handler) {
      return NextResponse.json(
        { error: "RPC handler not found" },
        { status: 500 }
      );
    }

    const result = await procedureAny["~orpc"].handler({
      input: {
        comparisonType,
        metric,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        comparisonType: (result as { comparisonType: string }).comparisonType,
        xAxisLabel: (result as { xAxisLabel: string }).xAxisLabel,
        data: (result as { data: Array<{ label: string; current: number; previous: number }> }).data,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Dashboard performance error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
