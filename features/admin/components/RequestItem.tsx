/**
 * RequestItem Component - Displays a single creative request in accordion format
 *
 * IMPORTANT - UNIFIED MODEL:
 * This component displays ONE creative request that flows through the entire workflow.
 * It is NOT showing separate "request" and "response" entities.
 *
 * The same creative (same offer, same details) goes through:
 * Publisher Submit → Admin Review → Advertiser Review → Final Status
 *
 * Button logic reflects who can act at each stage:
 * - status='new' + approvalStage='admin': Admin can approve or reject
 * - status='pending' + approvalStage='advertiser': Advertiser acts (not shown in admin view)
 * - status='sent-back' + approvalStage='advertiser': Admin can reject and send back to advertiser
 * - All other states: View only
 */

"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

import { getVariables } from "@/components/_variables/variables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import MultipleCreativesModal from "@/features/publisher/components/form/_modals/MultipleCreativesModal";
import SingleCreativeViewModal from "@/features/publisher/components/form/_modals/SingleCreativeViewModal";

import {
  getRequestViewData,
  type RequestViewData,
} from "../actions/request.actions";
import {
  approveRequest,
  forwardRequest,
  rejectRequest,
  returnRequest,
} from "../services/adminRequests.client";
import type { CreativeRequest } from "../types/request.types";

const MAX_COMMENT_LENGTH = 5000;

interface RequestItemProps {
  request: CreativeRequest;
  colorVariant: "purple" | "blue";
  viewButtonText?: string;
  showDownloadButton?: boolean;
  onRefresh?: () => void;
  onStatusUpdate?: (
    requestId: string,
    newStatus:
      | "new"
      | "pending"
      | "approved"
      | "rejected"
      | "sent-back"
      | "revised",
    newApprovalStage: "admin" | "advertiser" | "completed"
  ) => void;
  isAdvertiserView?: boolean;
}

const getPriorityBadgeClass = (priority: string) => {
  if (priority.toLowerCase().includes("high")) {
    return "rounded-[20px] border border-[#FCA5A5] bg-[#FFDFDF] h-7 px-1.5 text-xs  xl:text-sm font-inter  text-[#D70000]";
  }
  if (priority.toLowerCase().includes("medium")) {
    return "rounded-[20px] border border-[#FCD34D] bg-[#FFF8DB] h-7 px-1.5 text-xs  xl:text-sm font-inter  text-[#B18100]";
  }

  return "rounded-[20px] border border-[#93C5FD] bg-[#DBEAFE] h-7 px-1.5 text-xs  xl:text-sm font-inter  text-[#1E40AF]";
};

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case "new":
      return "rounded-[20px] border border-[#93C5FD] bg-[#DBEAFE] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#1E40AF]";
    case "pending":
      return "rounded-[20px] border border-[#FCD34D] bg-[#FFF8DB] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#B18100]";
    case "approved":
      return "rounded-[20px] border border-[#86EFAC] bg-[#DCFCE7] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#15803D]";
    case "rejected":
      return "rounded-[20px] border border-[#FCA5A5] bg-[#FEE2E2] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#DC2626]";
    case "sent-back":
      return "rounded-[20px] border border-[#C4B5FD] bg-[#EDE9FE] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#7C3AED]";
    case "revised":
      return "rounded-[20px] border border-[#67E8F9] bg-[#CFFAFE] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#0891B2]";
    default:
      return "rounded-[20px] border border-[#D1D5DB] bg-[#F3F4F6] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#6B7280]";
  }
};

const getStatusLabel = (
  status: string,
  approvalStage: string,
  isAdvertiserView: boolean = false
) => {
  const normalizedStatus = status.toLowerCase();
  const normalizedStage = approvalStage.toLowerCase();

  if (normalizedStatus === "approved" && normalizedStage === "completed") {
    return "Fully Approved";
  }

  if (normalizedStatus === "approved" && normalizedStage === "admin") {
    return "Approved by Admin";
  }

  if (normalizedStatus === "pending" && normalizedStage === "admin") {
    return "Pending";
  }

  if (normalizedStatus === "pending" && normalizedStage === "advertiser") {
    // Show "Pending" for advertiser view, "Forwarded to Advertiser" for admin view
    return isAdvertiserView ? "Pending" : "Forwarded to Advertiser";
  }

  if (normalizedStatus === "rejected" && normalizedStage === "admin") {
    return "Rejected by Admin";
  }

  if (normalizedStatus === "rejected" && normalizedStage === "advertiser") {
    return "Rejected by Advertiser";
  }

  if (normalizedStatus === "sent-back" && normalizedStage === "admin") {
    return "Sent Back to Publisher";
  }

  if (normalizedStatus === "sent-back" && normalizedStage === "advertiser") {
    return "Returned by Advertiser";
  }

  if (normalizedStatus === "revised" && normalizedStage === "admin") {
    return "Revised - Pending Review";
  }

  switch (normalizedStatus) {
    case "new":
      return "New";
    case "pending":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "sent-back":
      return "Sent Back";
    case "revised":
      return "Revised";
    default:
      return status;
  }
};

const shouldShowActionButtons = (
  status: string,
  approvalStage: string
): boolean => {
  const normalizedStatus = status.toLowerCase();
  const normalizedStage = approvalStage.toLowerCase();

  // Show buttons for new requests awaiting admin review
  if (normalizedStatus === "new" && normalizedStage === "admin") {
    return true;
  }

  // Show buttons for pending requests with admin (
  //  tab - 2+ days old)
  if (normalizedStatus === "pending" && normalizedStage === "admin") {
    return true;
  }

  // Show buttons for revised requests (resubmitted by publisher after being sent back)
  if (normalizedStatus === "revised" && normalizedStage === "admin") {
    return true;
  }

  return false;
};

const shouldShowRejectButtonOnly = (
  status: string,
  approvalStage: string
): boolean => {
  const normalizedStatus = status.toLowerCase();
  const normalizedStage = approvalStage.toLowerCase();

  return normalizedStatus === "sent-back" && normalizedStage === "advertiser";
};

const shouldShowNotifyButton = (
  status: string,
  approvalStage: string
): boolean => {
  const normalizedStatus = status.toLowerCase();
  const _normalizedStage = approvalStage.toLowerCase();

  // Show Notify button for approved requests (both admin and completed stages)
  if (normalizedStatus === "approved") {
    return true;
  }

  // Show Notify button for rejected requests (both admin and advertiser stages)
  if (normalizedStatus === "rejected") {
    return true;
  }

  return false;
};

const getAccordionColors = (
  variant: "purple" | "blue",
  colors: ReturnType<typeof getVariables>["colors"]
) => {
  if (variant === "purple") {
    return {
      backgroundColor: colors.AccordionPurpleBackgroundColor,
      borderColor: colors.AccordionPurpleBorderColor,
      offerIdBackgroundColor: colors.AccordionPurpleOfferIdBackgroundColor,
      offerIdTextColor: colors.AccordionPurpleOfferIdTextColor,
    };
  }

  return {
    backgroundColor: colors.AccordionBlueBackgroundColor,
    borderColor: colors.AccordionBlueBorderColor,
    offerIdBackgroundColor: colors.AccordionBlueOfferIdBackgroundColor,
    offerIdTextColor: colors.AccordionBlueOfferIdTextColor,
  };
};

export function RequestItem({
  request,
  colorVariant,
  viewButtonText = "View Request",
  showDownloadButton = false,
  onRefresh: _onRefresh,
  onStatusUpdate,
  isAdvertiserView = false,
}: RequestItemProps) {
  const variables = getVariables();
  const accordionColors = getAccordionColors(colorVariant, variables.colors);

  // Popover states
  const [approvePopoverOpen, setApprovePopoverOpen] = useState(false);
  const [rejectPopoverOpen, setRejectPopoverOpen] = useState(false);
  const [sendBackPopoverOpen, setSendBackPopoverOpen] = useState(false);

  // Comment states
  const [rejectComments, setRejectComments] = useState("");
  const [sendBackComments, setSendBackComments] = useState("");

  // Loading states
  const [isApproving, setIsApproving] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSendingBack, setIsSendingBack] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);

  const [viewData, setViewData] = useState<RequestViewData | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);

  // Character count for comments
  const rejectCommentsLength = useMemo(() => {
    const text = rejectComments.replace(/<[^>]*>/g, "");
    return text.length;
  }, [rejectComments]);

  const sendBackCommentsLength = useMemo(() => {
    const text = sendBackComments.replace(/<[^>]*>/g, "");
    return text.length;
  }, [sendBackComments]);

  const isRejectCommentsValid = rejectCommentsLength <= MAX_COMMENT_LENGTH;
  const isSendBackCommentsValid = sendBackCommentsLength <= MAX_COMMENT_LENGTH;

  // Check if popover has unsaved changes
  const hasUnsavedRejectComments = rejectComments.trim().length > 0;
  const hasUnsavedSendBackComments = sendBackComments.trim().length > 0;

  // Handle popover close with warning
  const handleRejectPopoverClose = useCallback(
    async (open: boolean) => {
      if (!open && hasUnsavedRejectComments) {
        const confirmed = await confirmDialog({
          title: "Unsaved Comments",
          description:
            "You have unsaved comments. Are you sure you want to close?",
          confirmText: "Close",
          cancelText: "No, keep editing",
          variant: "default",
          onConfirm: () => {
            setRejectPopoverOpen(false);
            setRejectComments("");
            setError(null);
          },
        });
        if (!confirmed) {
          return;
        }
      } else {
        setRejectPopoverOpen(open);
        if (!open) {
          setRejectComments("");
          setError(null);
        }
      }
    },
    [hasUnsavedRejectComments]
  );

  const handleSendBackPopoverClose = useCallback(
    async (open: boolean) => {
      if (!open && hasUnsavedSendBackComments) {
        const confirmed = await confirmDialog({
          title: "Unsaved Comments",
          description:
            "You have unsaved comments. Are you sure you want to close?",
          confirmText: "Close",
          cancelText: "No, keep editing",
          variant: "default",
          onConfirm: () => {
            setSendBackPopoverOpen(false);
            setSendBackComments("");
            setError(null);
          },
        });
        if (!confirmed) {
          return;
        }
      } else {
        setSendBackPopoverOpen(open);
        if (!open) {
          setSendBackComments("");
          setError(null);
        }
      }
    },
    [hasUnsavedSendBackComments]
  );

  const meta = [
    `Creative Type: ${request.creativeType}`,
    `Creative Count: ${request.creativeCount}`,
    `From Lines Count: ${request.fromLinesCount}`,
    `Subject Lines Count: ${request.subjectLinesCount}`,
  ];

  return (
    <Accordion.Item
      value={request.id}
      className="rounded-[10px] overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:border-opacity-80"
      style={{
        backgroundColor: accordionColors.backgroundColor,
        border: `1px solid ${accordionColors.borderColor}`,
      }}
    >
      <Accordion.Header>
        <Accordion.Trigger className="flex w-full items-center justify-between px-5 py-4 text-left group transition-all duration-200 hover:opacity-90">
          <div className="flex flex-wrap items-center lg:gap-3 gap-2 text-xs xl:text-sm leading-relaxed">
            <span
              className="font-inter"
              style={{ color: variables.colors.requestCardTextColor }}
            >
              {request.date}
            </span>
            <span style={{ color: variables.colors.requestCardTextColor }}>
              |
            </span>
            <span
              className="font-inter"
              style={{ color: variables.colors.requestCardTextColor }}
            >
              {request.advertiserName} - ADV ID :{" "}
              <span className="font-inter font-semibold">
                {request.advertiserEverflowId || request.affiliateId || ""}
              </span>
            </span>
            <span
              className="font-inter"
              style={{ color: variables.colors.requestCardTextColor }}
            >
              |
            </span>

            <Badge
              variant="outline"
              className={getPriorityBadgeClass(request.priority)}
            >
              {request.priority}
            </Badge>

            <span
              className="font-inter"
              style={{ color: variables.colors.requestCardTextColor }}
            >
              |
            </span>

            <Badge
              variant="outline"
              className={getStatusBadgeClass(request.status)}
            >
              {getStatusLabel(
                request.status,
                request.approvalStage,
                isAdvertiserView
              )}
            </Badge>
          </div>

          <div className="flex items-center transition-transform duration-200 group-hover:scale-105">
            <ChevronDown className="h-7 w-7 text-[#525252] group-data-[state=open]:hidden transition-all duration-200" />
            <ChevronUp className="h-7 w-7 text-[#525252] hidden group-data-[state=open]:block transition-all duration-200" />
          </div>
        </Accordion.Trigger>
      </Accordion.Header>

      <div
        className="grid grid-cols-[1fr_220px] items-center border-t bg-white px-5 py-4 transition-all duration-200"
        style={{
          borderTop: "1px solid #D6D6D6",
          backgroundColor: accordionColors.backgroundColor,
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5 text-xs xl:text-sm leading-relaxed">
          <span
            className="rounded-[20px] h-6 px-1 text-xs xl:text-sm font-inter font-medium flex items-center justify-center"
            style={{
              backgroundColor: accordionColors.offerIdBackgroundColor,
            }}
          >
            <span style={{ color: accordionColors.offerIdTextColor }}>
              Offer ID: {request.offerId}
            </span>
          </span>
          <span className="font-inter text-xs xl:text-sm">
            {request.offerName}
          </span>
          <span className="font-inter text-xs xl:text-sm text-gray-400">|</span>
          <span
            className="font-inter text-xs xl:text-sm font-semibold"
            style={{ color: variables.colors.requestCardTextColor }}
          >
            Client:
          </span>
          <span
            className="font-inter text-xs xl:text-sm"
            style={{ color: variables.colors.requestCardTextColor }}
          >
            {request.clientId}
          </span>
          <span className="font-inter text-xs xl:text-sm text-gray-400">|</span>
          <span
            className="font-inter text-xs xl:text-sm"
            style={{ color: variables.colors.requestCardTextColor }}
          >
            {request.clientName}
          </span>
        </div>

        <Button
          variant="outline"
          className="justify-self-end xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          style={{
            color: variables.colors.requestCardViewButtonTextColor,
            backgroundColor:
              variables.colors.requestCardViewButtonBackgroundColor,
            border: `1px solid ${variables.colors.requestCardViewButtonBorderColor}`,
          }}
          disabled={isViewLoading}
          onClick={async () => {
            setIsViewLoading(true);
            setError(null);
            try {
              const data = await getRequestViewData(request.id);
              if (!data) {
                toast.error("No creatives found", {
                  description: "This request has no creative files.",
                });
                return;
              }
              setViewData(data);
              setIsViewModalOpen(true);
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : "Failed to load request";
              setError(msg);
              toast.error("Failed to load request", { description: msg });
            } finally {
              setIsViewLoading(false);
            }
          }}
        >
          {isViewLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            viewButtonText
          )}
        </Button>
      </div>

      <Accordion.Content className="bg-white overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up transition-all duration-300 ease-in-out">
        <div
          className="grid grid-cols-[1fr_220px]  xlg:gap-6 gap-3 px-5 pb-5 items-start"
          style={{
            backgroundColor: accordionColors.backgroundColor,
          }}
        >
          <div className="flex flex-col gap-6 text-xs xl:text-sm">
            <div className="flex flex-wrap gap-2">
              {meta.map((m, index) => (
                <span
                  key={index}
                  className="rounded-[4px] border bg-white px-2 h-7 text-xs xl:text-sm font-normal flex items-center justify-center leading-4 font-inter shadow-[0_0_2px_0_rgba(30,64,175,0.1)] transition-all duration-200 hover:shadow-md hover:scale-105"
                  style={{ color: variables.colors.requestCardTextColor }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {shouldShowNotifyButton(request.status, request.approvalStage) ? (
            <div className="flex flex-col gap-4 xl:gap-4 justify-self-end">
              <Button
                className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                style={{
                  color: variables.colors.requestCardApproveButtonTextColor,
                  backgroundColor:
                    variables.colors.requestCardApproveButtonBackgroundColor,
                }}
                disabled={isNotifying}
                onClick={async () => {
                  setIsNotifying(true);
                  setError(null);

                  try {
                    // TODO: BACKEND - Implement Notify Handler (UNIFIED MODEL)
                    //
                    // API Endpoint: POST /api/admin/creative-requests/:id/notify
                    //
                    // Request Body:
                    // {
                    //   actionBy: string (user ID),
                    //   status: string ("approved" | "rejected"),
                    //   approvalStage: string ("admin" | "advertiser" | "completed")
                    // }
                    //
                    // Backend Requirements:
                    // 1. Validate user has permission to send notifications
                    // 2. Retrieve request details from creative_requests table
                    // 3. Determine notification recipients based on status:
                    //    - If approved: notify publisher and advertiser
                    //    - If rejected: notify publisher
                    // 4. Send email/notification to appropriate parties
                    // 5. Log notification in notification_logs table (optional)
                    // 6. Return success response with notification details
                    //
                    // Response Format:
                    // {
                    //   success: boolean,
                    //   message: string,
                    //   notificationId?: string,
                    //   recipients?: string[]
                    // }
                    //
                    // const response = await fetch(`/api/admin/creative-requests/${request.id}/notify`, {
                    //   method: 'POST',
                    //   headers: {
                    //     'Content-Type': 'application/json',
                    //     'Authorization': `Bearer ${getAuthToken()}`
                    //   },
                    //   body: JSON.stringify({
                    //     actionBy: getCurrentUserId(),
                    //     status: request.status,
                    //     approvalStage: request.approvalStage
                    //   })
                    // });
                    //
                    // if (!response.ok) {
                    //   const errorData = await response.json();
                    //   throw new Error(errorData.message || 'Failed to send notification');
                    // }

                    // Simulate API call delay
                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    const statusLabel =
                      request.status === "approved" ? "approved" : "rejected";
                    toast.success("Notification sent", {
                      description: `The ${statusLabel} request notification has been sent successfully.`,
                    });
                  } catch (err) {
                    const errorMessage =
                      err instanceof Error
                        ? err.message
                        : "Failed to send notification. Please try again.";
                    setError(errorMessage);
                    toast.error("Failed to send notification", {
                      description: errorMessage,
                    });
                  } finally {
                    setIsNotifying(false);
                  }
                }}
                aria-label="Notify about this request"
              >
                {isNotifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Notifying...
                  </>
                ) : (
                  "Notify"
                )}
              </Button>
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                  <p className="text-xs text-destructive font-inter">{error}</p>
                </div>
              )}
            </div>
          ) : shouldShowActionButtons(request.status, request.approvalStage) ? (
            <div className="flex flex-col gap-4 xl:gap-4 justify-self-end">
              <Popover
                open={approvePopoverOpen}
                onOpenChange={setApprovePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                    style={{
                      color: variables.colors.requestCardApproveButtonTextColor,
                      backgroundColor:
                        variables.colors
                          .requestCardApproveButtonBackgroundColor,
                    }}
                  >
                    Approve / Forward
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-4"
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-inter font-medium text-sm">
                        What would you like to do?
                      </h4>
                      <p className="font-inter text-xs text-muted-foreground">
                        Choose an action for this creative request.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full font-inter text-xs xl:text-sm font-medium"
                        style={{
                          color:
                            variables.colors.requestCardApproveButtonTextColor,
                          backgroundColor:
                            variables.colors
                              .requestCardApproveButtonBackgroundColor,
                        }}
                        disabled={isApproving || isForwarding}
                        onClick={async () => {
                          setApprovePopoverOpen(false);
                          setIsApproving(true);
                          setError(null);
                          try {
                            await approveRequest(request.id);
                            onStatusUpdate?.(
                              request.id,
                              "approved",
                              "completed"
                            );
                            toast.success("Request approved", {
                              description:
                                "The request has been successfully approved.",
                            });
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to approve request. Please try again.";
                            setError(errorMessage);
                            toast.error("Failed to approve request", {
                              description: errorMessage,
                            });
                          } finally {
                            setIsApproving(false);
                          }
                        }}
                        aria-label="Approve this creative request"
                      >
                        {isApproving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Approving...
                          </>
                        ) : (
                          "Approve"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full font-inter text-xs xl:text-sm font-medium"
                        style={{
                          color:
                            variables.colors.requestCardViewButtonTextColor,
                          borderColor:
                            variables.colors.requestCardViewButtonBorderColor,
                        }}
                        disabled={isApproving || isForwarding}
                        onClick={async () => {
                          setApprovePopoverOpen(false);
                          setIsForwarding(true);
                          setError(null);

                          try {
                            await forwardRequest(request.id);
                            onStatusUpdate?.(
                              request.id,
                              "pending",
                              "advertiser"
                            );
                            toast.success("Request forwarded to advertiser", {
                              description:
                                "The request has been forwarded for advertiser review.",
                            });
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to forward request. Please try again.";
                            setError(errorMessage);
                            toast.error("Failed to forward request", {
                              description: errorMessage,
                            });
                          } finally {
                            setIsForwarding(false);
                          }
                        }}
                        aria-label="Forward this creative request to advertiser"
                      >
                        {isForwarding ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Forwarding...
                          </>
                        ) : (
                          "Forward to Advertiser"
                        )}
                      </Button>
                    </div>
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                        <p className="text-xs text-destructive font-inter">
                          {error}
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover
                open={rejectPopoverOpen}
                onOpenChange={handleRejectPopoverClose}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                    style={{
                      color:
                        variables.colors.requestCardRejectedButtonTextColor,
                      backgroundColor:
                        variables.colors
                          .requestCardRejectedButtonBackgroundColor,
                      border: `1px solid ${variables.colors.requestCardRejectedButtonBorderColor}`,
                    }}
                  >
                    Reject / Send Back
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[500px] p-4"
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-inter font-medium text-sm">
                        What would you like to do?
                      </h4>
                      <p className="font-inter text-xs text-muted-foreground">
                        Add comments and choose an action for this creative
                        request.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          className="font-inter text-xs font-medium"
                          htmlFor="reject-comments"
                        >
                          Comments{" "}
                          <span className="text-muted-foreground">
                            (Optional)
                          </span>
                        </label>
                        <span
                          className={`text-xs font-inter ${
                            isRejectCommentsValid
                              ? "text-muted-foreground"
                              : "text-destructive"
                          }`}
                        >
                          {rejectCommentsLength} / {MAX_COMMENT_LENGTH}
                        </span>
                      </div>
                      <RichTextEditor
                        value={rejectComments}
                        onChange={setRejectComments}
                        placeholder="Enter comments or reason for rejection..."
                        className="min-h-[200px]"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: isRejectCommentsValid
                            ? variables.colors.inputBorderColor
                            : "#dc2626",
                        }}
                        aria-label="Comments for rejection or send back action"
                        aria-invalid={!isRejectCommentsValid}
                      />
                      {!isRejectCommentsValid && (
                        <p className="text-xs text-destructive font-inter">
                          Comments exceed maximum length of {MAX_COMMENT_LENGTH}{" "}
                          characters.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row gap-2 pt-2">
                      <Button
                        className="flex-1 font-inter text-xs xl:text-sm font-medium"
                        style={{
                          color:
                            variables.colors.requestCardRejectedButtonTextColor,
                          backgroundColor:
                            variables.colors
                              .requestCardRejectedButtonBackgroundColor,
                          border: `1px solid ${variables.colors.requestCardRejectedButtonBorderColor}`,
                        }}
                        disabled={
                          isRejecting || isSendingBack || !isRejectCommentsValid
                        }
                        onClick={async () => {
                          setRejectPopoverOpen(false);
                          setIsRejecting(true);
                          setError(null);
                          try {
                            await rejectRequest(request.id, rejectComments);
                            onStatusUpdate?.(
                              request.id,
                              "rejected",
                              "completed"
                            );
                            toast.success("Request rejected", {
                              description:
                                "The request has been rejected successfully.",
                            });
                            setRejectComments("");
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to reject request. Please try again.";
                            setError(errorMessage);
                            toast.error("Failed to reject request", {
                              description: errorMessage,
                            });
                          } finally {
                            setIsRejecting(false);
                          }
                        }}
                        aria-label="Reject this creative request"
                      >
                        {isRejecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Rejecting...
                          </>
                        ) : (
                          "Reject"
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 font-inter text-xs xl:text-sm font-medium bg-destructive! text-destructive-foreground! hover:bg-destructive/90!"
                        disabled={
                          isRejecting || isSendingBack || !isRejectCommentsValid
                        }
                        onClick={async () => {
                          setRejectPopoverOpen(false);
                          setIsSendingBack(true);
                          setError(null);

                          try {
                            await returnRequest(request.id, rejectComments);
                            onStatusUpdate?.(request.id, "sent-back", "admin");
                            toast.success("Request sent back to publisher", {
                              description:
                                "The request has been sent back to the publisher for revision.",
                            });
                            setRejectComments("");
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to send back request. Please try again.";
                            setError(errorMessage);
                            toast.error("Failed to send back request", {
                              description: errorMessage,
                            });
                          } finally {
                            setIsSendingBack(false);
                          }
                        }}
                        aria-label="Send back this creative request to publisher"
                      >
                        {isSendingBack ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Sending...
                          </>
                        ) : (
                          "Send Back to Publisher"
                        )}
                      </Button>
                    </div>
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                        <p className="text-xs text-destructive font-inter">
                          {error}
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {showDownloadButton && (
                <Button
                  variant="outline"
                  className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    color: variables.colors.requestCardViewButtonTextColor,
                    backgroundColor:
                      variables.colors.requestCardViewButtonBackgroundColor,
                    border: `1px solid ${variables.colors.requestCardViewButtonBorderColor}`,
                  }}
                  onClick={async () => {
                    // TODO: BACKEND - Implement Creative File Download (UNIFIED MODEL)
                    //
                    // Backend API Endpoint:
                    // GET /api/admin/creative-requests/:id/download
                    //
                    // Backend should handle file type based on creative_type field:
                    // - "Email" → .zip or .xlsx (if multiple creatives)
                    // - "Display" → .zip (images/assets)
                    // - "Social" → .zip (images/videos)
                    // - Other types → appropriate file format
                    //
                    // Backend Implementation:
                    // 1. Retrieve the creative file(s) associated with the request ID
                    // 2. Determine file type based on creative_type field
                    // 3. If multiple files, create a ZIP archive
                    // 4. Set appropriate Content-Type header
                    // 5. Set Content-Disposition header for download
                    // 6. Stream file(s) to client
                    //
                    // Response Headers:
                    // - Content-Type: application/zip | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | image/* | etc.
                    // - Content-Disposition: attachment; filename="creative-{requestId}-{creativeType}.{ext}"
                    // - Content-Length: {fileSize}
                    //
                    // Implementation Example:
                    // try {
                    //   const response = await fetch(`/api/admin/creative-requests/${request.id}/download`, {
                    //     method: 'GET',
                    //     headers: {
                    //       'Authorization': `Bearer ${getAuthToken()}`
                    //     }
                    //   });
                    //
                    //   if (!response.ok) {
                    //     throw new Error('Failed to download creative');
                    //   }
                    //
                    //   const blob = await response.blob();
                    //   const url = window.URL.createObjectURL(blob);
                    //   const a = document.createElement('a');
                    //   a.href = url;
                    //   a.download = `creative-${request.id}-${request.creativeType.toLowerCase()}.${getFileExtension(blob.type)}`;
                    //   document.body.appendChild(a);
                    //   a.click();
                    //   window.URL.revokeObjectURL(url);
                    //   document.body.removeChild(a);
                    // } catch (error) {
                    //   console.error('Error downloading creative:', error);
                    //   toast.error('Failed to download creative. Please try again.');
                    // }
                    //
                    // Database Schema Addition Needed:
                    // ALTER TABLE creative_requests ADD COLUMN file_url VARCHAR(500);
                    // ALTER TABLE creative_requests ADD COLUMN file_type VARCHAR(50);
                    // ALTER TABLE creative_requests ADD COLUMN file_name VARCHAR(255);
                    // ALTER TABLE creative_requests ADD COLUMN file_size BIGINT;
                    //
                    // OR if multiple files per creative:
                    // CREATE TABLE creative_files (
                    //   id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    //   request_id VARCHAR(255) NOT NULL,
                    //   file_url VARCHAR(500) NOT NULL,
                    //   file_type VARCHAR(50) NOT NULL,
                    //   file_name VARCHAR(255) NOT NULL,
                    //   file_size BIGINT NOT NULL,
                    //   file_order INT DEFAULT 0,
                    //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    //   FOREIGN KEY (request_id) REFERENCES creative_requests(id) ON DELETE CASCADE,
                    //   INDEX idx_request_id (request_id)
                    // );

                    try {
                      toast.success("Download started", {
                        description: "Your creative file download has started.",
                      });
                    } catch (err) {
                      const errorMessage =
                        err instanceof Error
                          ? err.message
                          : "Failed to download creative. Please try again.";
                      setError(errorMessage);
                      toast.error("Download failed", {
                        description: errorMessage,
                      });
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  aria-label="Download creative file"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : shouldShowRejectButtonOnly(
              request.status,
              request.approvalStage
            ) ? (
            <div className="flex flex-col gap-4 xl:gap-4 justify-self-end">
              <Popover
                open={sendBackPopoverOpen}
                onOpenChange={handleSendBackPopoverClose}
              >
                <PopoverTrigger asChild>
                  <Button
                    className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                    style={{
                      color:
                        variables.colors.requestCardRejectedButtonTextColor,
                      backgroundColor:
                        variables.colors
                          .requestCardRejectedButtonBackgroundColor,
                      border: `1px solid ${variables.colors.requestCardRejectedButtonBorderColor}`,
                    }}
                  >
                    Reject / Send Back
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[500px] p-4"
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-inter font-medium text-sm">
                        What would you like to do?
                      </h4>
                      <p className="font-inter text-xs text-muted-foreground">
                        Add comments and choose an action for this creative
                        request.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          className="font-inter text-xs font-medium"
                          htmlFor="send-back-comments"
                        >
                          Comments{" "}
                          <span className="text-muted-foreground">
                            (Optional)
                          </span>
                        </label>
                        <span
                          className={`text-xs font-inter ${
                            isSendBackCommentsValid
                              ? "text-muted-foreground"
                              : "text-destructive"
                          }`}
                        >
                          {sendBackCommentsLength} / {MAX_COMMENT_LENGTH}
                        </span>
                      </div>
                      <RichTextEditor
                        value={sendBackComments}
                        onChange={setSendBackComments}
                        placeholder="Enter comments or reason for rejection..."
                        className="min-h-[200px]"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: isSendBackCommentsValid
                            ? variables.colors.inputBorderColor
                            : "#dc2626",
                        }}
                        aria-label="Comments for rejection or send back action"
                        aria-invalid={!isSendBackCommentsValid}
                      />
                      {!isSendBackCommentsValid && (
                        <p className="text-xs text-destructive font-inter">
                          Comments exceed maximum length of {MAX_COMMENT_LENGTH}{" "}
                          characters.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row gap-2 pt-2">
                      <Button
                        className="flex-1 font-inter text-xs xl:text-sm font-medium"
                        style={{
                          color:
                            variables.colors.requestCardRejectedButtonTextColor,
                          backgroundColor:
                            variables.colors
                              .requestCardRejectedButtonBackgroundColor,
                          border: `1px solid ${variables.colors.requestCardRejectedButtonBorderColor}`,
                        }}
                        disabled={
                          isRejecting ||
                          isSendingBack ||
                          !isSendBackCommentsValid
                        }
                        onClick={async () => {
                          setSendBackPopoverOpen(false);
                          setIsRejecting(true);
                          setError(null);

                          try {
                            await rejectRequest(request.id, sendBackComments);
                            onStatusUpdate?.(
                              request.id,
                              "rejected",
                              "completed"
                            );
                            toast.success("Request rejected", {
                              description:
                                "The request has been rejected successfully.",
                            });
                            setSendBackComments("");
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to reject request. Please try again.";
                            setError(errorMessage);
                            toast.error("Failed to reject request", {
                              description: errorMessage,
                            });
                          } finally {
                            setIsRejecting(false);
                          }
                        }}
                        aria-label="Reject this creative request"
                      >
                        {isRejecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Rejecting...
                          </>
                        ) : (
                          "Reject"
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 font-inter text-xs xl:text-sm font-medium bg-destructive! text-destructive-foreground! hover:bg-destructive/90!"
                        disabled={
                          isRejecting ||
                          isSendingBack ||
                          !isSendBackCommentsValid
                        }
                        onClick={async () => {
                          setSendBackPopoverOpen(false);
                          setIsSendingBack(true);
                          setError(null);
                          try {
                            await returnRequest(request.id, sendBackComments);
                            onStatusUpdate?.(request.id, "sent-back", "admin");
                            toast.success("Request sent back to publisher", {
                              description:
                                "The request has been sent back to the publisher for revision.",
                            });
                            setSendBackComments("");
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to send back request. Please try again.";
                            setError(errorMessage);
                            toast.error("Failed to send back request", {
                              description: errorMessage,
                            });
                          } finally {
                            setIsSendingBack(false);
                          }
                        }}
                        aria-label="Send back this creative request to publisher"
                      >
                        {isSendingBack ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Sending...
                          </>
                        ) : (
                          "Send Back to Publisher"
                        )}
                      </Button>
                    </div>
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                        <p className="text-xs text-destructive font-inter">
                          {error}
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {showDownloadButton && (
                <Button
                  variant="outline"
                  className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    color: variables.colors.requestCardViewButtonTextColor,
                    backgroundColor:
                      variables.colors.requestCardViewButtonBackgroundColor,
                    border: `1px solid ${variables.colors.requestCardViewButtonBorderColor}`,
                  }}
                  onClick={async () => {
                    // TODO: BACKEND - Implement Creative File Download (UNIFIED MODEL)
                    //
                    // Backend API Endpoint:
                    // GET /api/admin/creative-requests/:id/download
                    //
                    // Backend should handle file type based on creative_type field:
                    // - "Email" → .zip or .xlsx (if multiple creatives)
                    // - "Display" → .zip (images/assets)
                    // - "Social" → .zip (images/videos)
                    // - Other types → appropriate file format
                    //
                    // Backend Implementation:
                    // 1. Retrieve the creative file(s) associated with the request ID
                    // 2. Determine file type based on creative_type field
                    // 3. If multiple files, create a ZIP archive
                    // 4. Set appropriate Content-Type header
                    // 5. Set Content-Disposition header for download
                    // 6. Stream file(s) to client
                    //
                    // Response Headers:
                    // - Content-Type: application/zip | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | image/* | etc.
                    // - Content-Disposition: attachment; filename="creative-{requestId}-{creativeType}.{ext}"
                    // - Content-Length: {fileSize}
                    //
                    // Implementation Example:
                    // try {
                    //   const response = await fetch(`/api/admin/creative-requests/${request.id}/download`, {
                    //     method: 'GET',
                    //     headers: {
                    //       'Authorization': `Bearer ${getAuthToken()}`
                    //     }
                    //   });
                    //
                    //   if (!response.ok) {
                    //     throw new Error('Failed to download creative');
                    //   }
                    //
                    //   const blob = await response.blob();
                    //   const url = window.URL.createObjectURL(blob);
                    //   const a = document.createElement('a');
                    //   a.href = url;
                    //   a.download = `creative-${request.id}-${request.creativeType.toLowerCase()}.${getFileExtension(blob.type)}`;
                    //   document.body.appendChild(a);
                    //   a.click();
                    //   window.URL.revokeObjectURL(url);
                    //   document.body.removeChild(a);
                    // } catch (error) {
                    //   console.error('Error downloading creative:', error);
                    //   toast.error('Failed to download creative. Please try again.');
                    // }
                    //
                    // Database Schema Addition Needed:
                    // ALTER TABLE creative_requests ADD COLUMN file_url VARCHAR(500);
                    // ALTER TABLE creative_requests ADD COLUMN file_type VARCHAR(50);
                    // ALTER TABLE creative_requests ADD COLUMN file_name VARCHAR(255);
                    // ALTER TABLE creative_requests ADD COLUMN file_size BIGINT;
                    //
                    // OR if multiple files per creative:
                    // CREATE TABLE creative_files (
                    //   id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    //   request_id VARCHAR(255) NOT NULL,
                    //   file_url VARCHAR(500) NOT NULL,
                    //   file_type VARCHAR(50) NOT NULL,
                    //   file_name VARCHAR(255) NOT NULL,
                    //   file_size BIGINT NOT NULL,
                    //   file_order INT DEFAULT 0,
                    //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    //   FOREIGN KEY (request_id) REFERENCES creative_requests(id) ON DELETE CASCADE,
                    //   INDEX idx_request_id (request_id)
                    // );

                    try {
                      toast.success("Download started", {
                        description: "Your creative file download has started.",
                      });
                    } catch (err) {
                      const errorMessage =
                        err instanceof Error
                          ? err.message
                          : "Failed to download creative. Please try again.";
                      setError(errorMessage);
                      toast.error("Download failed", {
                        description: errorMessage,
                      });
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  aria-label="Download creative file"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : showDownloadButton ? (
            <div className="flex flex-col gap-4 xl:gap-4 justify-self-end">
              <Button
                variant="outline"
                className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  color: variables.colors.requestCardViewButtonTextColor,
                  backgroundColor:
                    variables.colors.requestCardViewButtonBackgroundColor,
                  border: `1px solid ${variables.colors.requestCardViewButtonBorderColor}`,
                }}
                disabled={isDownloading}
                onClick={async () => {
                  setIsDownloading(true);
                  setError(null);

                  try {
                    // TODO: BACKEND - Implement Creative File Download (UNIFIED MODEL)
                    //
                    // Backend API Endpoint:
                    // GET /api/admin/creative-requests/:id/download
                    //
                    // Backend should handle file type based on creative_type field:
                    // - "Email" → .zip or .xlsx (if multiple creatives)
                    // - "Display" → .zip (images/assets)
                    // - "Social" → .zip (images/videos)
                    // - Other types → appropriate file format
                    //
                    // Backend Implementation:
                    // 1. Retrieve the creative file(s) associated with the request ID
                    // 2. Determine file type based on creative_type field
                    // 3. If multiple files, create a ZIP archive
                    // 4. Set appropriate Content-Type header
                    // 5. Set Content-Disposition header for download
                    // 6. Stream file(s) to client
                    //
                    // Response Headers:
                    // - Content-Type: application/zip | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | image/* | etc.
                    // - Content-Disposition: attachment; filename="creative-{requestId}-{creativeType}.{ext}"
                    // - Content-Length: {fileSize}
                    //
                    // Implementation Example:
                    // try {
                    //   const response = await fetch(`/api/admin/creative-requests/${request.id}/download`, {
                    //     method: 'GET',
                    //     headers: {
                    //       'Authorization': `Bearer ${getAuthToken()}`
                    //     }
                    //   });
                    //
                    //   if (!response.ok) {
                    //     throw new Error('Failed to download creative');
                    //   }
                    //
                    //   const blob = await response.blob();
                    //   const url = window.URL.createObjectURL(blob);
                    //   const a = document.createElement('a');
                    //   a.href = url;
                    //   a.download = `creative-${request.id}-${request.creativeType.toLowerCase()}.${getFileExtension(blob.type)}`;
                    //   document.body.appendChild(a);
                    //   a.click();
                    //   window.URL.revokeObjectURL(url);
                    //   document.body.removeChild(a);
                    // } catch (error) {
                    //   console.error('Error downloading creative:', error);
                    //   toast.error('Failed to download creative. Please try again.');
                    // }
                    //
                    // Database Schema Addition Needed:
                    // ALTER TABLE creative_requests ADD COLUMN file_url VARCHAR(500);
                    // ALTER TABLE creative_requests ADD COLUMN file_type VARCHAR(50);
                    // ALTER TABLE creative_requests ADD COLUMN file_name VARCHAR(255);
                    // ALTER TABLE creative_requests ADD COLUMN file_size BIGINT;
                    //
                    // OR if multiple files per creative:
                    // CREATE TABLE creative_files (
                    //   id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    //   request_id VARCHAR(255) NOT NULL,
                    //   file_url VARCHAR(500) NOT NULL,
                    //   file_type VARCHAR(50) NOT NULL,
                    //   file_name VARCHAR(255) NOT NULL,
                    //   file_size BIGINT NOT NULL,
                    //   file_order INT DEFAULT 0,
                    //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    //   FOREIGN KEY (request_id) REFERENCES creative_requests(id) ON DELETE CASCADE,
                    //   INDEX idx_request_id (request_id)
                    // };

                    toast.success("Download started", {
                      description: "Your creative file download has started.",
                    });
                  } catch (err) {
                    const errorMessage =
                      err instanceof Error
                        ? err.message
                        : "Failed to download creative. Please try again.";
                    setError(errorMessage);
                    toast.error("Download failed", {
                      description: errorMessage,
                    });
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                aria-label="Download creative file"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </Accordion.Content>

      {viewData?.type === "single" && (
        <SingleCreativeViewModal
          isOpen={isViewModalOpen && viewData.type === "single"}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewData(null);
          }}
          creative={viewData.creative}
          showAdditionalNotes={true}
          creativeType={viewData.creativeType}
          viewOnly={true}
        />
      )}

      {viewData?.type === "multiple" && (
        <MultipleCreativesModal
          isOpen={isViewModalOpen && viewData.type === "multiple"}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewData(null);
          }}
          creatives={viewData.creatives}
          onRemoveCreative={() => {}}
          creativeType={viewData.creativeType}
        />
      )}
    </Accordion.Item>
  );
}
