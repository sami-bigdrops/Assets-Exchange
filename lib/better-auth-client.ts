"use client";

import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

const getBaseURL = () => {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (process.env.NODE_ENV === "development") {
      console.log("Auth client baseURL (client):", origin);
    }
    return origin;
  }
  if (env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    if (process.env.NODE_ENV === "development") {
      console.log("Auth client baseURL (env):", env.NEXT_PUBLIC_BETTER_AUTH_URL);
    }
    return env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }
  if (env.NEXT_PUBLIC_APP_URL) {
    if (process.env.NODE_ENV === "development") {
      console.log("Auth client baseURL (app):", env.NEXT_PUBLIC_APP_URL);
    }
    return env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    const vercelUrl = `https://${process.env.VERCEL_URL}`;
    if (process.env.NODE_ENV === "development") {
      console.log("Auth client baseURL (vercel):", vercelUrl);
    }
    return vercelUrl;
  }
  const localhost = "http://localhost:3000";
  if (process.env.NODE_ENV === "development") {
    console.log("Auth client baseURL (default):", localhost);
  }
  return localhost;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signOut, signUp, useSession } = authClient;
