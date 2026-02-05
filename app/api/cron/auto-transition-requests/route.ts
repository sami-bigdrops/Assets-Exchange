import { and, eq, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { creativeRequests } from "@/lib/schema";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  const authHeader = req.headers.get("Authorization");
  const userAgent = req.headers.get("user-agent") || "";
  const cronSecret = process.env.CRON_SECRET;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const isAdmin = session?.user?.role === "admin";

  if (!isAdmin) {
    const isVercelCron =
      vercelCronHeader === "1" || userAgent.includes("vercel-cron");
    const isAuthorizedSecret =
      cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !isAuthorizedSecret) {
      console.warn("Cron endpoint accessed without authorization");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const result = await db
      .update(creativeRequests)
      .set({
        status: "pending",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(creativeRequests.status, "new"),
          eq(creativeRequests.approvalStage, "admin"),
          lt(creativeRequests.submittedAt, fifteenDaysAgo)
        )
      )
      .returning({ id: creativeRequests.id });

    console.warn(
      `Auto-transitioned ${result.length} requests from 'new' to 'pending'`
    );

    return NextResponse.json({
      success: true,
      message: `Auto-transitioned ${result.length} requests from 'new' to 'pending'`,
      transitionedCount: result.length,
      transitionedIds: result.map((r) => r.id),
    });
  } catch (error) {
    console.error("Error auto-transitioning requests:", error);
    return NextResponse.json(
      {
        error: "Failed to auto-transition requests",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
