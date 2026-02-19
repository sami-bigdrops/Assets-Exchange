import { headers } from "next/headers";
import { NextResponse } from "next/server";

import type { DashboardStats } from "@/features/admin/types/dashboard.types";
import { auth } from "@/lib/auth";


export const dynamic = "force-dynamic";

function createEmptyDashboardStats(): DashboardStats {
  const zero = { today: 0, yesterday: 0 };
  const hist = { yesterday: 0, currentMonth: 0, lastMonth: 0 };
  return {
    totals: {
      totalAssets: 0,
      newRequests: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    },
    trends: {
      totalAssets: zero,
      newRequests: zero,
      approved: zero,
      rejected: zero,
      pending: zero,
    },
    historicalData: {
      totalAssets: hist,
      newRequests: hist,
      approved: hist,
      rejected: hist,
      pending: hist,
    },
  };
}

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "advertiser") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = createEmptyDashboardStats();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("Advertiser dashboard stats error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
