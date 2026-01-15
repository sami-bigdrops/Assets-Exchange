import { type NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { router } from "@/lib/rpc/router";

export const runtime = "nodejs";

function getProcedureFromPath(
  routerObj: Record<string, unknown>,
  pathSegments: string[]
): unknown | null {
  let current: unknown = routerObj;

  for (const segment of pathSegments) {
    if (
      current &&
      typeof current === "object" &&
      segment in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }

  return current;
}

async function handleGET(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  let rpcPath = pathname.replace(/^\/api\/rpc\/?/, "");
  if (rpcPath.includes(".")) {
    rpcPath = rpcPath.replace(/\./g, "/");
  }
  const pathSegments = rpcPath.split("/").filter(Boolean);

  if (pathSegments.length === 0) {
    return NextResponse.json(
      { error: "Invalid RPC path" },
      { status: 400 }
    );
  }

  const procedure = getProcedureFromPath(router, pathSegments);

  if (!procedure) {
    logger.api.warn("RPC procedure not found (GET)", { path: rpcPath, pathSegments });
    return NextResponse.json(
      { error: "Procedure not found" },
      { status: 404 }
    );
  }

  try {
    const procedureAny = procedure as {
      "~orpc"?: { handler?: (opts: { input: unknown }) => Promise<unknown> };
      func?: (input: unknown) => Promise<unknown>;
    };

    let result: unknown;

    if (
      procedureAny["~orpc"] &&
      typeof procedureAny["~orpc"].handler === "function"
    ) {
      result = await procedureAny["~orpc"].handler({ input: undefined });
    } else if (typeof procedureAny === "function") {
      result = await (procedureAny as (input: unknown) => Promise<unknown>)(
        undefined
      );
    } else {
      logger.api.error("Procedure is not callable (GET)", {
        path: rpcPath,
        procedureKeys: Object.keys(procedureAny),
      });
      return NextResponse.json(
        { error: "Procedure is not callable" },
        { status: 500 }
      );
    }

    return NextResponse.json({ json: result, meta: [] });
  } catch (error) {
    logger.api.error("RPC procedure error (GET)", {
      path: rpcPath,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        json: {
          defined: false,
          code: "INTERNAL_SERVER_ERROR",
          status: 500,
          message: error instanceof Error ? error.message : "Internal error",
        },
      },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  let rpcPath = pathname.replace(/^\/api\/rpc\/?/, "");
  if (rpcPath.includes(".")) {
    rpcPath = rpcPath.replace(/\./g, "/");
  }
  const pathSegments = rpcPath.split("/").filter(Boolean);

  if (pathSegments.length === 0) {
    return NextResponse.json(
      { error: "Invalid RPC path" },
      { status: 400 }
    );
  }

  const procedure = getProcedureFromPath(router, pathSegments);

  if (!procedure) {
    logger.api.warn("RPC procedure not found", { path: rpcPath, pathSegments });
    return NextResponse.json(
      { error: "Procedure not found" },
      { status: 404 }
    );
  }

  try {
    let input: unknown;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const text = await request.text();
      if (text) {
        const parsed = JSON.parse(text);
        input = parsed.json !== undefined ? parsed.json : parsed;
      }
    }

    const procedureAny = procedure as {
      "~orpc"?: { handler?: (opts: { input: unknown }) => Promise<unknown> };
      func?: (input: unknown) => Promise<unknown>;
    };

    let result: unknown;

    if (
      procedureAny["~orpc"] &&
      typeof procedureAny["~orpc"].handler === "function"
    ) {
      result = await procedureAny["~orpc"].handler({ input });
    } else if (typeof procedureAny === "function") {
      result = await (procedureAny as (input: unknown) => Promise<unknown>)(
        input
      );
    } else {
      logger.api.error("Procedure is not callable", {
        path: rpcPath,
        procedureKeys: Object.keys(procedureAny),
      });
      return NextResponse.json(
        { error: "Procedure is not callable" },
        { status: 500 }
      );
    }

    return NextResponse.json({ json: result, meta: [] });
  } catch (error) {
    logger.api.error("RPC procedure error", {
      path: rpcPath,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          json: {
            defined: false,
            code: "BAD_REQUEST",
            status: 400,
            message: "Invalid JSON in request body",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        json: {
          defined: false,
          code: "INTERNAL_SERVER_ERROR",
          status: 500,
          message: error instanceof Error ? error.message : "Internal error",
        },
      },
      { status: 500 }
    );
  }
}

export const HEAD = handleGET;
export const GET = handleGET;
export const POST = handlePOST;
export const PUT = handlePOST;
export const PATCH = handlePOST;
export const DELETE = handlePOST;

