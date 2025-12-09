"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import type { Router } from "./router";

// @ts-expect-error - oRPC type inference issue with flat router structure
export const rpc = createORPCClient<Router>(
  new RPCLink({
    url: "/api/rpc",
  })
);
