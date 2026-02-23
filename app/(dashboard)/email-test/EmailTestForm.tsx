"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailTestForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter an email address");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.details ?? data.error ?? "Failed to send test email");
        return;
      }
      toast.success(data.message ?? "Test email sent");
      setEmail("");
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test Email</h1>
        <p className="text-muted-foreground">
          Send a test email via AWS SES to verify the email service is
          configured correctly.
        </p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Send test email</CardTitle>
          <CardDescription>
            Enter the recipient email address. The address must be verified in
            AWS SES if your account is in sandbox mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={sending}
              className="max-w-sm"
            />
          </div>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              "Sending..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send test email
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
