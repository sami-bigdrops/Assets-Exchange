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
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "Logging in via:",
          `${window.location.origin}/api/auth/signin/email`
        );
      }

      const result = await signIn.email({
        email: credentials.email,
        password: credentials.password,
      });

      if (result.error) {
        let errorMessage = "Login failed. Please check your credentials.";

        if (result.error.code) {
          switch (result.error.code) {
            case "INVALID_EMAIL_OR_PASSWORD":
            case "INVALID_CREDENTIALS":
              errorMessage =
                "Invalid email or password. Please check your credentials and try again.";
              break;
            case "USER_NOT_FOUND":
              errorMessage = "No account found with this email address.";
              break;
            case "INVALID_PASSWORD":
              errorMessage = "Incorrect password. Please try again.";
              break;
            case "EMAIL_NOT_VERIFIED":
              errorMessage =
                "Please verify your email address before signing in.";
              break;
            case "ACCOUNT_LOCKED":
            case "TOO_MANY_ATTEMPTS":
              errorMessage = "Too many login attempts. Please try again later.";
              break;
            default:
              errorMessage = result.error.message || errorMessage;
          }
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }

        // Robust error logging
        const errorToLog = result.error;
        if (errorToLog instanceof Response) {
          console.error("Login query failed:", {
            status: errorToLog.status,
            statusText: errorToLog.statusText,
          });
          errorToLog
            .text()
            .then((t) => console.error("Login error body:", t))
            .catch(() => {});
        } else if (errorToLog instanceof Error) {
          console.error("Login error message:", errorToLog.message);
          console.error("Login error stack:", errorToLog.stack);
        } else {
          console.error("Login error raw:", errorToLog);
          console.error(
            "Login error stringified:",
            JSON.stringify(errorToLog, Object.getOwnPropertyNames(errorToLog))
          );
        }

        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      if (!result.data) {
        console.error("Login failed: No data received");
        setError("Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard - it will handle role-based routing
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      // Robust exception logging
      if (err instanceof Error) {
        console.error("Login exception source:", err.message);
        console.error("Login exception stack:", err.stack);
      } else {
        console.error("Login exception raw:", err);
        console.error(
          "Login exception stringified:",
          JSON.stringify(
            err,
            Object.getOwnPropertyNames(err as Record<string, unknown>)
          )
        );
      }

      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred during login. Please try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    handleLogin,
    isLoading,
    error,
    clearError,
  };
}
