import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export interface RpcSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: "admin" | "advertiser" | "administrator";
  };
}

export async function getRpcSession(): Promise<RpcSession> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.name,
        role: session.user.role as "admin" | "advertiser" | "administrator",
      },
    };
  } catch (error) {
    logger.rpc.error("Failed to get RPC session", { error });
    throw new Error("Unauthorized");
  }
}

export async function requireRpcAuth(): Promise<RpcSession> {
  return getRpcSession();
}

export async function requireRpcRole(
  allowedRoles: Array<"admin" | "advertiser" | "administrator">
): Promise<RpcSession> {
  const session = await getRpcSession();

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error(`Forbidden: Required role ${allowedRoles.join(" or ")}`);
  }

  return session;
}

export async function requireRpcAdmin(): Promise<RpcSession> {
  return requireRpcRole(["admin", "administrator"]);
}

