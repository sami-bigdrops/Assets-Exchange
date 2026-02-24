import "server-only";

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { env } from "@/env";

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
  const fromEmail = env.AWS_SES_FROM_EMAIL;

  if (!fromEmail?.trim()) {
    throw new Error("AWS_SES_FROM_EMAIL is not set");
  }

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
  return await ses.send(command);
}

/**
 * Optional helper (useful for health checks / feature toggles)
 */
export function isEmailConfigured(): boolean {
  return Boolean(env.AWS_SES_FROM_EMAIL?.trim());
}
