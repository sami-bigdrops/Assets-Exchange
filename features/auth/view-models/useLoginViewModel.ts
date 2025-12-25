"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn } from "@/lib/better-auth-client";

import type { LoginCredentials } from "../types/auth.types";

export function useLoginViewModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      if (typeof window !== "undefined") {
        console.log("Login attempt:", {
          email: credentials.email,
          baseURL: window.location.origin,
        });
      }

      const result = await signIn.email({
        email: credentials.email,
        password: credentials.password,
      });

      console.log("Login result:", { hasError: !!result.error, hasData: !!result.data });

      if (result.error) {
        const errorMessage =
          result.error.message ||
          result.error.code ||
          "Login failed. Please check your credentials.";
        console.error("Login error:", result.error);
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      if (!result.data) {
        console.error("Login failed: No data received");
        setError("Login failed. No data received from server.");
        setIsLoading(false);
        return;
      }

      console.log("Login successful, redirecting...");
      // Redirect to dashboard - it will handle role-based routing
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Login exception:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred during login. Please try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return {
    handleLogin,
    isLoading,
    error,
  };
}
