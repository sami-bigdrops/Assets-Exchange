import "server-only";

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { env } from "@/env";
import { logExternalCall } from "@/lib/analytics/externalCalls.service";

/**
 * AWS SES Singleton Client
 * (Prevents multiple client instances in a server runtime)
 */
let client: SESClient | null = null;

function getSESClient(): SESClient {
  if (!client) {
    const region = env.AWS_REGION?.trim();
    const accessKeyId = env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = env.AWS_SECRET_ACCESS_KEY?.trim();
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "SES is not configured: set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY"
      );
    }
    client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

/**
 * ✅ Task 1 required function signature:
 * sendEmail({ to, subject, html })
 *
 * ✅ Phase 9 requirement:
 * Every email sent must be logged in external_calls
 * service: 'ses', endpoint: 'SendEmail'
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const startedAt = Date.now();

  const fromEmail = env.AWS_SES_FROM_EMAIL;
  if (!fromEmail?.trim()) {
    throw new Error("AWS_SES_FROM_EMAIL is not set");
  }

  // Good enough estimate for analytics
  const requestSize =
    (to?.length ?? 0) + (subject?.length ?? 0) + (html?.length ?? 0);

  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
      },
      Subject: { Data: subject, Charset: "UTF-8" },
    },
    Source: fromEmail,
  });

  const ses = getSESClient();

  try {
    const res = await ses.send(command);
    const responseTimeMs = Date.now() - startedAt;

    await logExternalCall({
      service: "ses",
      endpoint: "SendEmail",
      method: "POST",
      requestSize,
      responseTimeMs,
      statusCode: 200,
      errorMessage: null,
    });

    return res;
  } catch (err: unknown) {
    const responseTimeMs = Date.now() - startedAt;

    const errorMessage =
      err instanceof Error ? err.message : "Unknown SES error";

    await logExternalCall({
      service: "ses",
      endpoint: "SendEmail",
      method: "POST",
      requestSize,
      responseTimeMs,
      statusCode: 500,
      errorMessage,
    });

    throw err;
  }
}

/**
 * Optional helper (useful for health checks / feature toggles)
 */
export function isEmailConfigured(): boolean {
  return Boolean(env.AWS_SES_FROM_EMAIL?.trim());
}
