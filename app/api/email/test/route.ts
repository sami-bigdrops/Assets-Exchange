import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/ses";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const to =
      typeof body.to === "string" ? body.to.trim() : session.user.email;
    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' email address" },
        { status: 400 }
      );
    }

    const subject = "Assets Exchange - Test Email";
    const text = `This is a test email from the Assets Exchange application.\n\nIf you received this, the AWS SES email service is configured correctly.\n\nSent at: ${new Date().toISOString()}`;
    const html = `<p>This is a test email from the Assets Exchange application.</p><p>If you received this, the AWS SES email service is configured correctly.</p><p><small>Sent at: ${new Date().toISOString()}</small></p>`;

    await sendEmail({ to, subject, text, html });

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${to}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send test email";
    return NextResponse.json(
      { error: "Send failed", details: message },
      { status: 500 }
    );
  }
}
