"use client";

import {
  ArrowLeft,
  File,
  FileText,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CreativeReview } from "@/features/admin";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

interface AnnotatePageClientProps {
  creativeId: string;
  creativeUrl: string;
  creativeType: "image" | "html";
  fileName?: string;
  fileTypeLabel?: string;
  fileSize?: number;
  requestId?: string;
  action?: "send-back" | "reject";
  readOnly?: boolean;
  userRole?: string;
}

export function AnnotatePageClient({
  creativeId,
  creativeUrl,
  creativeType,
  fileName = "Creative",
  fileTypeLabel,
  fileSize = 0,
  requestId,
  action,
  readOnly = false,
  userRole,
}: AnnotatePageClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async () => {
    if (!requestId || !action) return;

    setIsSubmitting(true);
    try {
      let endpoint: string;
      let body: Record<string, string>;

      const normalizedRole = userRole?.toLowerCase();
      if (normalizedRole === "advertiser") {
        endpoint =
          action === "send-back"
            ? `/api/advertiser/responses/${requestId}/send-back`
            : `/api/advertiser/responses/${requestId}/reject`;
        body = {
          reason: "Please review the specific annotations added to the file.",
        };
      } else {
        endpoint =
          action === "send-back"
            ? `/api/admin/requests/${requestId}/return`
            : `/api/admin/requests/${requestId}/reject`;
        body = {
          feedback: "Please review the specific annotations added to the file.",
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Action failed");

      toast.success(
        action === "send-back" ? "Request returned" : "Request rejected"
      );
      router.push(normalizedRole === "advertiser" ? "/dashboard" : "/requests");
      router.refresh();
    } catch {
      toast.error("Failed to process action");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayType =
    fileTypeLabel ?? (creativeType === "image" ? "Image" : "HTML");
  const hasConfirm = requestId && action && !readOnly;

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", "view");
    url.searchParams.delete("action");
    url.searchParams.delete("requestId");
    navigator.clipboard.writeText(url.toString());
    toast.success("View-only link copied to clipboard");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <header className="flex-none bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back"
            className="shrink-0 h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {creativeType === "image" ? (
            <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
          ) : creativeType === "html" ? (
            <FileText className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <File className="h-5 w-5 text-gray-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-800 truncate min-w-0">
            {fileName}
          </span>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded border border-purple-200 shrink-0">
            {displayType}
          </span>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 shrink-0">
            {formatFileSize(fileSize)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5 text-gray-700"
          >
            <Link2 className="h-4 w-4" />
            Share
          </Button>
          {hasConfirm && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleAction}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : action === "send-back"
                  ? "Confirm Send Back"
                  : "Confirm Rejection"}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <CreativeReview
          creativeId={creativeId}
          creativeUrl={creativeUrl}
          creativeType={creativeType}
          fileName={fileName}
          fileTypeLabel={displayType}
          fileSize={fileSize}
          hideHeader
          actionLabel={
            action === "send-back"
              ? "Confirm Send Back"
              : action === "reject"
                ? "Confirm Rejection"
                : undefined
          }
          onAction={hasConfirm ? handleAction : undefined}
          isSubmitting={isSubmitting}
          readOnly={readOnly}
        />
      </main>
    </div>
  );
}
