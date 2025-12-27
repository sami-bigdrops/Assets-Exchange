import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import "server-only";

import { env } from "@/env";

import { db } from "./db";
import { logger } from "./logger";

const getTrustedOrigins = (): string[] => {
  const origins: string[] = [];

  if (process.env.CORS_ALLOWED_ORIGINS) {
    origins.push(
      ...process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) =>
        origin.trim()
      )
    );
  }

  if (env.NEXT_PUBLIC_APP_URL) {
    origins.push(env.NEXT_PUBLIC_APP_URL);
  }

  if (env.BETTER_AUTH_URL) {
    origins.push(env.BETTER_AUTH_URL);
  }

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
  }

  origins.push("https://assetsexchange.net");
  origins.push("https://www.assetsexchange.net");

  return [...new Set(origins)];
};

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
  trustedOrigins: getTrustedOrigins(),
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
