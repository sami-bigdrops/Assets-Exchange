import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { GrammarService } from "@/lib/services/grammar.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  const isVercelCron = vercelCronHeader === "1";

  logger.info(
    {
      action: "warmup.grammar.cron.start",
      isVercelCron,
      timestamp: new Date().toISOString(),
    },
    "Grammar warmup cron job started"
  );

  try {
    const result = await GrammarService.warmupService();

    logger.info(
      {
        action: "warmup.grammar.cron.success",
        success: result.success,
        message: result.message,
      },
      "Grammar warmup cron job completed"
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
      triggeredBy: isVercelCron ? "vercel-cron" : "manual",
    });
  } catch (error) {
    logger.error(
      {
        action: "warmup.grammar.cron.error",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      "Grammar warmup cron job failed"
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
