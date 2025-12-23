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
import { ChevronDown, ChevronUp } from "lucide-react";

import { getVariables } from "@/components/_variables/variables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Request } from "../types/admin.types";

interface RequestItemProps {
  request: Request;
  colorVariant: "purple" | "blue";
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
    default:
      return "rounded-[20px] border border-[#D1D5DB] bg-[#F3F4F6] h-7 px-2 text-xs xl:text-sm font-inter font-medium text-[#6B7280]";
  }
};

const getStatusLabel = (status: string, approvalStage: string) => {
  const normalizedStatus = status.toLowerCase();
  const normalizedStage = approvalStage.toLowerCase();

  if (normalizedStatus === "approved" && normalizedStage === "completed") {
    return "Fully Approved";
  }

  if (normalizedStatus === "pending" && normalizedStage === "advertiser") {
    return "Pending Advertiser Approval";
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

  return normalizedStatus === "new" && normalizedStage === "admin";
};

const shouldShowRejectButtonOnly = (
  status: string,
  approvalStage: string
): boolean => {
  const normalizedStatus = status.toLowerCase();
  const normalizedStage = approvalStage.toLowerCase();

  return normalizedStatus === "sent-back" && normalizedStage === "advertiser";
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

export function RequestItem({ request, colorVariant }: RequestItemProps) {
  const variables = getVariables();
  const accordionColors = getAccordionColors(colorVariant, variables.colors);

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
              {request.advertiserName} - AFF ID :{" "}
              <span className="font-inter font-semibold">
                {request.affiliateId}
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
              {getStatusLabel(request.status, request.approvalStage)}
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
          // TODO: BACKEND - Implement View Request Navigation (UNIFIED MODEL)
          //
          // onClick={() => {
          //   router.push(`/requests/${request.id}`);
          // }}
          //
          // Create detailed view page at /requests/[id]/page.tsx showing:
          // - Full creative/offer details (immutable)
          // - Complete approval timeline from creative_request_history table
          // - Admin approval info (who, when, comments)
          // - Advertiser response info (who, when, comments)
          // - Current status and next steps
          // - Action buttons if applicable
          // - Export functionality
          //
          // Example timeline:
          // [Dec 20, 10:30] Publisher submitted creative
          // [Dec 21, 14:15] Admin approved and forwarded to advertiser
          // [Dec 22, 09:00] Advertiser sent back for reconsideration
          // [Dec 22, 16:30] Admin rejected and sent to advertiser
        >
          View Request
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
            <div className="leading-relaxed font-inter flex items-center gap-2">
              <span
                className="font-inter text-sm font-semibold"
                style={{ color: variables.colors.requestCardTextColor }}
              >
                Client:
              </span>{" "}
              <span
                className="font-inter text-xs xl:text-sm "
                style={{ color: variables.colors.requestCardTextColor }}
              >
                {request.clientId}
              </span>{" "}
              |{" "}
              <span
                className="font-inter text-xs xl:text-sm "
                style={{ color: variables.colors.requestCardTextColor }}
              >
                {request.clientName}
              </span>
            </div>

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

          {shouldShowActionButtons(request.status, request.approvalStage) ? (
            <div className="flex flex-col gap-4 xl:gap-4 justify-self-end">
              <Button
                className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                style={{
                  color: variables.colors.requestCardApproveButtonTextColor,
                  backgroundColor:
                    variables.colors.requestCardApproveButtonBackgroundColor,
                }}
                // TODO: BACKEND - Implement Admin Approve Handler (UNIFIED MODEL)
                //
                // This updates the SAME record, NOT creating a new response entity
                //
                // onClick={async () => {
                //   try {
                //     setIsLoading(true);
                //
                //     const response = await fetch(`/api/admin/creative-requests/${request.id}/admin-approve`, {
                //       method: 'POST',
                //       headers: {
                //         'Content-Type': 'application/json',
                //         'Authorization': `Bearer ${getAuthToken()}`
                //       },
                //       body: JSON.stringify({
                //         actionBy: getCurrentUserId(),
                //         comments: '' // Optional: Add modal for comments
                //       })
                //     });
                //
                //     if (!response.ok) {
                //       throw new Error('Failed to approve request');
                //     }
                //
                //     const data = await response.json();
                //
                //     // The request is now: status='pending', approvalStage='advertiser'
                //     // It will appear in /response page for advertiser to review
                //     toast.success('Request approved and forwarded to advertiser');
                //
                //     await refreshRequests();
                //
                //   } catch (error) {
                //     console.error('Error approving request:', error);
                //     toast.error('Failed to approve request. Please try again.');
                //   } finally {
                //     setIsLoading(false);
                //   }
                // }}
              >
                Approve and Forward
              </Button>

              <Button
                variant="outline"
                className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                style={{
                  color: variables.colors.requestCardRejectedButtonTextColor,
                  backgroundColor:
                    variables.colors.requestCardRejectedButtonBackgroundColor,
                  border: `1px solid ${variables.colors.requestCardRejectedButtonBorderColor}`,
                }}
                // TODO: BACKEND - Implement Admin Reject Handler (UNIFIED MODEL)
                //
                // This updates the SAME record's status to rejected
                //
                // onClick={async () => {
                //   try {
                //     const rejectionReason = await showRejectionModal();
                //     if (!rejectionReason) return;
                //
                //     setIsLoading(true);
                //
                //     const response = await fetch(`/api/admin/creative-requests/${request.id}/admin-reject`, {
                //       method: 'POST',
                //       headers: {
                //         'Content-Type': 'application/json',
                //         'Authorization': `Bearer ${getAuthToken()}`
                //       },
                //       body: JSON.stringify({
                //         actionBy: getCurrentUserId(),
                //         comments: rejectionReason
                //       })
                //     });
                //
                //     if (!response.ok) {
                //       throw new Error('Failed to reject request');
                //     }
                //
                //     // The SAME request is now: status='rejected', approvalStage='admin'
                //     toast.success('Request rejected and sent back to publisher');
                //     await refreshRequests();
                //
                //   } catch (error) {
                //     console.error('Error rejecting request:', error);
                //     toast.error('Failed to reject request. Please try again.');
                //   } finally {
                //     setIsLoading(false);
                //   }
                // }}
              >
                Reject and Send Back
              </Button>
            </div>
          ) : shouldShowRejectButtonOnly(
              request.status,
              request.approvalStage
            ) ? (
            <div className="flex flex-col gap-4 xl:gap-4 justify-self-end">
              <Button
                variant="outline"
                className="xl:h-11 xl:w-47 h-10 w-40 font-inter text-xs xl:text-sm font-medium rounded-[6px] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                style={{
                  color: variables.colors.requestCardRejectedButtonTextColor,
                  backgroundColor:
                    variables.colors.requestCardRejectedButtonBackgroundColor,
                  border: `1px solid ${variables.colors.requestCardRejectedButtonBorderColor}`,
                }}
                // TODO: BACKEND - Implement Send Back to Advertiser Handler (UNIFIED MODEL)
                //
                // This button appears when advertiser sent back the request for reconsideration
                // Admin reviews again and can reject it back to advertiser
                //
                // IMPORTANT: This is the SAME creative request, just updating its status again
                //
                // onClick={async () => {
                //   try {
                //     const rejectionReason = await showRejectionModal();
                //     if (!rejectionReason) return;
                //
                //     setIsLoading(true);
                //
                //     // Same endpoint pattern, just updating the same record
                //     const response = await fetch(`/api/admin/creative-requests/${request.id}/advertiser-send-back`, {
                //       method: 'POST',
                //       headers: {
                //         'Content-Type': 'application/json',
                //         'Authorization': `Bearer ${getAuthToken()}`
                //       },
                //       body: JSON.stringify({
                //         actionBy: getCurrentUserId(),
                //         comments: rejectionReason
                //       })
                //     });
                //
                //     if (!response.ok) {
                //       throw new Error('Failed to send back request');
                //     }
                //
                //     // The SAME request status might change or stay sent-back with new comments
                //     toast.success('Request sent back to advertiser for reconsideration');
                //     await refreshRequests();
                //
                //   } catch (error) {
                //     console.error('Error sending back request:', error);
                //     toast.error('Failed to send back request. Please try again.');
                //   } finally {
                //     setIsLoading(false);
                //   }
                // }}
              >
                Reject and Send Back
              </Button>
            </div>
          ) : null}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
