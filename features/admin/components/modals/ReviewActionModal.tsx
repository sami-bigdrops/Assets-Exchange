"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CreativeReview } from "../annotations/CreativeReview";

interface ReviewActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  creative: { id: string; url: string; type: string };
  actionType: "reject" | "send-back" | "view";
  requestId: string;
  onSuccess: () => void;
  isAdvertiserView?: boolean;
}

export function ReviewActionModal({
  isOpen,
  onClose,
  title,
  creative,
  actionType,
  requestId,
  onSuccess,
  isAdvertiserView = false,
}: ReviewActionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmAction = async () => {
    setIsSubmitting(true);
    try {
      let endpoint = "";
      let body = {};

      if (isAdvertiserView) {
        endpoint = `/api/advertiser/responses/${requestId}/send-back`;
        body = {
          reason: "Please review the specific annotations added to the file.",
        };
      } else {
        endpoint =
          actionType === "send-back"
            ? `/api/admin/requests/${requestId}/return`
            : `/api/admin/requests/${requestId}/reject`;
        if (actionType === "send-back") {
          body = {
            feedback:
              "Please review the specific annotations added to the file.",
          };
        } else {
          body = {
            reason: "Please review the specific annotations added to the file.",
          };
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Action failed");

      toast.success(
        actionType === "send-back" ? "Request returned" : "Request rejected"
      );
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to process action");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-screen! max-h-screen! w-screen h-screen m-0 p-0 rounded-none flex flex-col gap-0 border-0">
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0 flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-white">
          <CreativeReview
            creativeId={creative.id}
            creativeUrl={creative.url}
            creativeType={creative.type.includes("image") ? "image" : "html"}
            actionLabel={
              actionType === "view"
                ? undefined
                : actionType === "send-back"
                  ? "Confirm Send Back"
                  : "Confirm Rejection"
            }
            onAction={actionType === "view" ? undefined : handleConfirmAction}
            isSubmitting={isSubmitting}
            isReadOnly={actionType === "view"}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
