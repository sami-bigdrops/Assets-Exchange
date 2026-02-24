import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "@/env";
import { sendEmail } from "@/lib/email/ses";

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

function buildLinkEmailHTML(params: {
  title: string;
  intro: string;
  buttonText: string;
  url: string;
}): string {
  const { title, intro, buttonText, url } = params;

  return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">${title}</h2>
      <p style="margin: 0 0 16px;">${intro}</p>
      <p style="margin: 0 0 20px;">
        <a href="${url}" style="display:inline-block; background:#111; color:#fff; padding:10px 14px; border-radius:8px; text-decoration:none;">
          ${buttonText}
        </a>
      </p>
      <p style="margin: 0 0 6px; font-size: 12px; color:#555;">If the button doesn’t work, copy and paste this link:</p>
      <p style="margin: 0; font-size: 12px; word-break: break-all;">
        <a href="${url}">${url}</a>
      </p>
    </div>
  `;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,

    sendEmail: async (ctx: {
      to: string;
      type: "magic_link" | "password_reset" | string;
      url: string;
    }) => {
      const { to, type, url } = ctx;

      const isReset =
        type === "password_reset" ||
        type === "reset" ||
        type === "reset_password";
      const subject = isReset ? "Reset your password" : "Your sign-in link";

      const html = isReset
        ? buildLinkEmailHTML({
            title: "Reset your password",
            intro: "Click the button below to reset your password.",
            buttonText: "Reset Password",
            url,
          })
        : buildLinkEmailHTML({
            title: "Sign in to Assets Exchange",
            intro:
              "Click the button below to sign in. This link will expire shortly.",
            buttonText: "Sign In",
            url,
          });

      await sendEmail({ to, subject, html });

      logger.auth.info(`Sent ${type} email to ${to}`);
    },
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
  logger.auth.info(
    `BetterAuth initialized - baseURL: ${baseURL}, basePath: /api/auth`
  );
}

export type Session = typeof auth.$Infer.Session;
