"use client";

import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signOut, signUp, useSession } = authClient;
