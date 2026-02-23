import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const region = process.env.AWS_REGION ?? "us-east-1";
const fromEmail =
  process.env.SES_FROM_EMAIL ?? process.env.AWS_SES_FROM_EMAIL ?? "";

let client: SESClient | null = null;

function getSESClient(): SESClient {
  if (!client) {
    client = new SESClient({
      region,
      ...(process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY && {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        }),
    });
  }
  return client;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, text, html, replyTo } = options;
  if (!fromEmail?.trim()) {
    throw new Error("SES_FROM_EMAIL or AWS_SES_FROM_EMAIL is not set");
  }
  const toAddresses = Array.isArray(to) ? to : [to];
  const ses = getSESClient();
  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: { ToAddresses: toAddresses },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Text: { Data: text, Charset: "UTF-8" },
        ...(html && { Html: { Data: html, Charset: "UTF-8" } }),
      },
    },
    ...(replyTo && { ReplyToAddresses: [replyTo] }),
  });
  await ses.send(command);
}

export function isEmailConfigured(): boolean {
  return Boolean(fromEmail?.trim());
}
