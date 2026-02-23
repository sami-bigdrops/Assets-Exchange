"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";

import {
  resetStuckScanningAssets,
  ResetStuckScanningError,
} from "../services/creatives.client";

interface ResetStuckJobsButtonProps {
  onSuccess?: () => void;
}

export function ResetStuckJobsButton({ onSuccess }: ResetStuckJobsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    // Prevent multiple simultaneous requests
    if (isLoading) {
      return;
    }

    const confirmed = await confirmDialog({
      title: "Reset Stuck Scanning Jobs",
      description:
        "This will reset all jobs stuck in SCANNING for more than 15 minutes. Continue?",
      variant: "default",
      icon: "warning",
      confirmText: "Continue",
      cancelText: "Cancel",
      onConfirm: () => {
        return Promise.resolve();
      },
    });

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetStuckScanningAssets();

      if (result.reset === 0) {
        toast.success("ℹ️ No stuck jobs found", {
          description: "All scanning jobs are running normally.",
        });
      } else {
        toast.success(`✅ ${result.reset} stuck jobs were reset to PENDING`, {
          description: `Successfully reset ${result.reset} stuck scanning job(s).`,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (error instanceof ResetStuckScanningError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          toast.error("❌ Failed to reset stuck jobs. Please try again.", {
            description: "Authentication required. Redirecting to login...",
          });
          setTimeout(() => {
            router.push("/auth");
          }, 1500);
          return;
        }

        if (error.statusCode === 500 || error.isNetworkError) {
          toast.error("❌ Failed to reset stuck jobs. Please try again.", {
            description: error.isNetworkError
              ? "Network error. Please check your connection."
              : "Server error. Please try again later.",
          });
          return;
        }

        toast.error("❌ Failed to reset stuck jobs. Please try again.", {
          description: "An unexpected error occurred.",
        });
        return;
      }

      toast.error("❌ Failed to reset stuck jobs. Please try again.", {
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleReset}
      disabled={isLoading}
      variant="outline"
      className="w-full sm:w-auto"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      {isLoading ? "Resetting..." : "Reset Stuck Jobs"}
    </Button>
  );
}
