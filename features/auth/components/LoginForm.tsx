"use client";

import { useState } from "react";
import { useLoginViewModel } from "../view-models/useLoginViewModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm() {
  const { handleLogin, isLoading, error } = useLoginViewModel();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleLogin({ email, password });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@assets-exchange.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Admin test credentials:</p>
          <p className="font-mono text-xs mt-1">
            Email: admin@assets-exchange.com
          </p>
          <p className="font-mono text-xs">Password: Admin@123</p>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Advertiser test credentials:</p>
          <p className="font-mono text-xs mt-1">
            Email: advertiser@assets-exchange.com
          </p>
          <p className="font-mono text-xs">Password: Advertiser@123</p>
        </div>
      </CardContent>
    </Card>
  );
}

