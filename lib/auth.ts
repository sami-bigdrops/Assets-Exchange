import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import "server-only";

import { env } from "@/env";

import { db } from "./db";
import { logger } from "./logger";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "admin",
      },
    },
  },
  baseURL:
    env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
});

// Log auth initialization in development
if (process.env.NODE_ENV === "development") {
  const baseURL =
    env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  logger.auth.info("BetterAuth initialized", {
    baseURL,
    basePath: "/api/auth",
  });
}

export type Session = typeof auth.$Infer.Session;
