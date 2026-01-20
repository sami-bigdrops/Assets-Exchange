"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

const link = new RPCLink({
  url:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/rpc`
      : "http://localhost:3000/api/rpc",
  headers: async () => {
    return {
      "Content-Type": "application/json",
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const client = createORPCClient<any>(link);

export const rpc = client;
