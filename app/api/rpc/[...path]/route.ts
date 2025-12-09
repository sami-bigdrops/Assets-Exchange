import { RPCHandler } from "@orpc/server/fetch";
import { type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { router } from "@/lib/rpc/router";

const handler = new RPCHandler(router);

export async function GET(request: NextRequest) {
  logger.api.info("RPC GET request", { path: request.nextUrl.pathname });

  const result = await handler.handle(request);
  if (result.matched) {
    logger.api.success("RPC GET request matched", {
      path: request.nextUrl.pathname,
    });
    return result.response;
  }

  logger.api.warn("RPC GET request not matched", {
    path: request.nextUrl.pathname,
  });
  return new Response("Not Found", { status: 404 });
}

export async function POST(request: NextRequest) {
  logger.api.info("RPC POST request", { path: request.nextUrl.pathname });

  const result = await handler.handle(request);
  if (result.matched) {
    logger.api.success("RPC POST request matched", {
      path: request.nextUrl.pathname,
    });
    return result.response;
  }

  logger.api.warn("RPC POST request not matched", {
    path: request.nextUrl.pathname,
  });
  return new Response("Not Found", { status: 404 });
}
