import { os } from "@orpc/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

export const health = os
  .output(
    z.object({
      status: z.string(),
      timestamp: z.string(),
    })
  )
  .handler(async () => {
    logger.rpc.info("Health check requested");
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
    logger.rpc.success("Health check completed", response);
    return response;
  });

export const router = {
  health,
};

export type Router = typeof router;
