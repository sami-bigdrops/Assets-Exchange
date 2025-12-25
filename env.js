import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url().optional(),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    VERCEL_URL: z.string().optional(),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(1).optional(),
    ADMIN_NAME: z.string().min(1).optional(),
    ADVERTISER_EMAIL: z.string().email().optional(),
    ADVERTISER_PASSWORD: z.string().min(1).optional(),
    ADVERTISER_NAME: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    VERCEL_URL: process.env.VERCEL_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_NAME: process.env.ADMIN_NAME,
    ADVERTISER_EMAIL: process.env.ADVERTISER_EMAIL,
    ADVERTISER_PASSWORD: process.env.ADVERTISER_PASSWORD,
    ADVERTISER_NAME: process.env.ADVERTISER_NAME,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
