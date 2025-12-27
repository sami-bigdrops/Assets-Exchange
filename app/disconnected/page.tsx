"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DisconnectedPage() {
  const router = useRouter();
  const variables = getVariables();
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Small delay to ensure connection is stable
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [router]);

  const handleRetry = async () => {
    setIsChecking(true);

    // Try to fetch a small resource to verify connection
    try {
      const response = await fetch("/favicon.ico", {
        method: "HEAD",
        cache: "no-cache",
      });

      if (response.ok) {
        setIsOnline(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 500);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGoHome = () => {
    router.push("/dashboard");
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{
        backgroundColor: variables.colors.dashboardBackground,
      }}
    >
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <div
              className="rounded-full p-6"
              style={{
                backgroundColor:
                  variables.colors.statsCardTrendIconColorNegative + "15",
              }}
            >
              <WifiOff
                className="h-16 w-16"
                style={{
                  color: variables.colors.statsCardTrendIconColorNegative,
                }}
              />
            </div>
          </div>
          <CardTitle
            className="text-3xl font-bold font-inter"
            style={{
              color: variables.colors.titleColor,
            }}
          >
            No Internet Connection
          </CardTitle>
          <CardDescription
            className="text-base font-inter"
            style={{
              color: variables.colors.descriptionColor,
            }}
          >
            It looks like you&apos;re not connected to the internet. Please
            check your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="rounded-lg p-4 space-y-2"
            style={{
              backgroundColor:
                variables.colors.cardHeaderBackgroundColor + "40",
            }}
          >
            <h3
              className="font-semibold text-sm font-inter"
              style={{
                color: variables.colors.labelColor,
              }}
            >
              What you can do:
            </h3>
            <ul
              className="space-y-2 text-sm font-inter list-disc list-inside"
              style={{
                color: variables.colors.descriptionColor,
              }}
            >
              <li>Check your Wi-Fi or mobile data connection</li>
              <li>Make sure your device is connected to a network</li>
              <li>Try moving to an area with better signal</li>
              <li>Restart your router or modem if needed</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRetry}
              disabled={isChecking}
              className="flex-1 font-inter"
              style={{
                backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                color: variables.colors.buttonDefaultTextColor,
              }}
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </>
              )}
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1 font-inter"
              style={{
                backgroundColor: variables.colors.buttonOutlineBackgroundColor,
                borderColor: variables.colors.buttonOutlineBorderColor,
                color: variables.colors.buttonOutlineTextColor,
              }}
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {!isOnline && (
            <div
              className="text-center text-xs font-inter"
              style={{
                color: variables.colors.descriptionColor,
              }}
            >
              <p>
                We&apos;ll automatically redirect you when your connection is
                restored.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
