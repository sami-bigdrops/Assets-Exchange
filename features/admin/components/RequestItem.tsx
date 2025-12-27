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
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { useState } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

import type { Request } from "../types/admin.types";

interface RequestItemProps {
  request: Request;
  colorVariant: "purple" | "blue";
  viewButtonText?: string;
  showDownloadButton?: boolean;
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

  if (normalizedStatus === "approved" && normalizedStage === "admin") {
    return "Approved by Admin";
  }

  if (normalizedStatus === "pending" && normalizedStage === "admin") {
    return "Pending";
  }

  if (normalizedStatus === "pending" && normalizedStage === "advertiser") {
    return "Pending";
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

  // Show buttons for new requests awaiting admin review
  if (normalizedStatus === "new" && normalizedStage === "admin") {
    return true;
  }

  // Show buttons for pending requests with admin (Pending Approvals tab - 2+ days old)
  if (normalizedStatus === "pending" && normalizedStage === "admin") {
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
}: RequestItemProps) {
  const variables = getVariables();
  const accordionColors = getAccordionColors(colorVariant, variables.colors);
  const [approvePopoverOpen, setApprovePopoverOpen] = useState(false);
  const [rejectPopoverOpen, setRejectPopoverOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState("");
  const [sendBackPopoverOpen, setSendBackPopoverOpen] = useState(false);
  const [sendBackComments, setSendBackComments] = useState("");

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
          // })
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
          {viewButtonText}
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
                        onClick={async () => {
                          setApprovePopoverOpen(false);
                          // TODO: BACKEND - Implement Admin Approve Handler (UNIFIED MODEL)
                          //
                          // This updates the SAME record, NOT creating a new response entity
                          //
                          // try {
                          //   setIsLoading(true);
                          //
                          //   const response = await fetch(`/api/admin/creative-requests/${request.id}/admin-approve`, {
                          //     method: 'POST',
                          //     headers: {
                          //       'Content-Type': 'application/json',
                          //       'Authorization': `Bearer ${getAuthToken()}`
                          //     },
                          //     body: JSON.stringify({
                          //       actionBy: getCurrentUserId(),
                          //       actionType: 'approve', // Just approve, don't forward
                          //       comments: '' // Optional: Add modal for comments
                          //     })
                          //   });
                          //
                          //   if (!response.ok) {
                          //     throw new Error('Failed to approve request');
                          //   }
                          //
                          //   const data = await response.json();
                          //
                          //   // The request is now: status='approved', approvalStage='admin'
                          //   toast.success('Request approved');
                          //
                          //   await refreshRequests();
                          //
                          // } catch (error) {
                          //   console.error('Error approving request:', error);
                          //   toast.error('Failed to approve request. Please try again.');
                          // } finally {
                          //   setIsLoading(false);
                          // }
                        }}
                      >
                        Approve
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
                        onClick={async () => {
                          setApprovePopoverOpen(false);
                          // TODO: BACKEND - Implement Admin Forward Handler (UNIFIED MODEL)
                          //
                          // This updates the SAME record, NOT creating a new response entity
                          //
                          // try {
                          //   setIsLoading(true);
                          //
                          //   const response = await fetch(`/api/admin/creative-requests/${request.id}/admin-approve`, {
                          //     method: 'POST',
                          //     headers: {
                          //       'Content-Type': 'application/json',
                          //       'Authorization': `Bearer ${getAuthToken()}`
                          //     },
                          //     body: JSON.stringify({
                          //       actionBy: getCurrentUserId(),
                          //       actionType: 'forward', // Forward to advertiser
                          //       comments: '' // Optional: Add modal for comments
                          //     })
                          //   });
                          //
                          //   if (!response.ok) {
                          //     throw new Error('Failed to forward request');
                          //   }
                          //
                          //   const data = await response.json();
                          //
                          //   // The request is now: status='pending', approvalStage='advertiser'
                          //   // It will appear in /response page for advertiser to review
                          //   toast.success('Request approved and forwarded to advertiser');
                          //
                          //   await refreshRequests();
                          //
                          // } catch (error) {
                          //   console.error('Error forwarding request:', error);
                          //   toast.error('Failed to forward request. Please try again.');
                          // } finally {
                          //   setIsLoading(false);
                          // }
                        }}
                      >
                        Forward to Advertiser
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover
                open={rejectPopoverOpen}
                onOpenChange={(open) => {
                  setRejectPopoverOpen(open);
                  if (!open) {
                    setRejectComments("");
                  }
                }}
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
                      <label
                        className="font-inter text-xs font-medium"
                        htmlFor="reject-comments"
                      >
                        Comments{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </label>
                      <RichTextEditor
                        value={rejectComments}
                        onChange={setRejectComments}
                        placeholder="Enter comments or reason for rejection..."
                        className="min-h-[200px]"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: variables.colors.inputBorderColor,
                        }}
                      />
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
                        onClick={async () => {
                          setRejectPopoverOpen(false);
                          // TODO: BACKEND - Implement Admin Reject Handler (UNIFIED MODEL)
                          //
                          // This updates the SAME record's status to rejected
                          //
                          // try {
                          //   setIsLoading(true);
                          //
                          //   const response = await fetch(`/api/admin/creative-requests/${request.id}/admin-reject`, {
                          //     method: 'POST',
                          //     headers: {
                          //       'Content-Type': 'application/json',
                          //       'Authorization': `Bearer ${getAuthToken()}`
                          //     },
                          //     body: JSON.stringify({
                          //       actionBy: getCurrentUserId(),
                          //       actionType: 'reject',
                          //       comments: rejectComments
                          //     })
                          //   });
                          //
                          //   if (!response.ok) {
                          //     throw new Error('Failed to reject request');
                          //   }
                          //
                          //   // The SAME request is now: status='rejected', approvalStage='admin'
                          //   toast.success('Request rejected and sent back to publisher');
                          //   await refreshRequests();
                          //   setRejectComments("");
                          //
                          // } catch (error) {
                          //   console.error('Error rejecting request:', error);
                          //   toast.error('Failed to reject request. Please try again.');
                          // } finally {
                          //   setIsLoading(false);
                          // }
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 font-inter text-xs xl:text-sm font-medium"
                        onClick={async () => {
                          setRejectPopoverOpen(false);
                          // TODO: BACKEND - Implement Admin Send Back Handler (UNIFIED MODEL)
                          //
                          // This sends the request back to the publisher
                          //
                          // try {
                          //   setIsLoading(true);
                          //
                          //   const response = await fetch(`/api/admin/creative-requests/${request.id}/admin-send-back`, {
                          //     method: 'POST',
                          //     headers: {
                          //       'Content-Type': 'application/json',
                          //       'Authorization': `Bearer ${getAuthToken()}`
                          //     },
                          //     body: JSON.stringify({
                          //       actionBy: getCurrentUserId(),
                          //       actionType: 'send-back',
                          //       comments: rejectComments
                          //     })
                          //   });
                          //
                          //   if (!response.ok) {
                          //     throw new Error('Failed to send back request');
                          //   }
                          //
                          //   // The SAME request is now: status='sent-back', approvalStage='admin'
                          //   toast.success('Request sent back to publisher');
                          //   await refreshRequests();
                          //   setRejectComments("");
                          //
                          // } catch (error) {
                          //   console.error('Error sending back request:', error);
                          //   toast.error('Failed to send back request. Please try again.');
                          // } finally {
                          //   setIsLoading(false);
                          // }
                        }}
                      >
                        Send Back to Publisher
                      </Button>
                    </div>
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
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
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
                onOpenChange={(open) => {
                  setSendBackPopoverOpen(open);
                  if (!open) {
                    setSendBackComments("");
                  }
                }}
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
                    Reject and Send Back
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
                        Reject and Send Back
                      </h4>
                      <p className="font-inter text-xs text-muted-foreground">
                        Add comments and send this request back to the
                        advertiser.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label
                        className="font-inter text-xs font-medium"
                        htmlFor="send-back-comments"
                      >
                        Comments{" "}
                        <span className="text-muted-foreground">
                          (Optional)
                        </span>
                      </label>
                      <RichTextEditor
                        value={sendBackComments}
                        onChange={setSendBackComments}
                        placeholder="Enter comments or reason for rejection..."
                        className="min-h-[200px]"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: variables.colors.inputBorderColor,
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        className="w-full font-inter text-xs xl:text-sm font-medium"
                        style={{
                          color:
                            variables.colors.requestCardRejectedButtonTextColor,
                          backgroundColor:
                            variables.colors
                              .requestCardRejectedButtonBackgroundColor,
                          border: `1px solid ${variables.colors.requestCardRejectedButtonBorderColor}`,
                        }}
                        onClick={async () => {
                          setSendBackPopoverOpen(false);
                          // TODO: BACKEND - Implement Send Back to Advertiser Handler (UNIFIED MODEL)
                          //
                          // This button appears when advertiser sent back the request for reconsideration
                          // Admin reviews again and can reject it back to advertiser
                          //
                          // IMPORTANT: This is the SAME creative request, just updating its status again
                          //
                          // try {
                          //   setIsLoading(true);
                          //
                          //   const response = await fetch(`/api/admin/creative-requests/${request.id}/advertiser-send-back`, {
                          //     method: 'POST',
                          //     headers: {
                          //       'Content-Type': 'application/json',
                          //       'Authorization': `Bearer ${getAuthToken()}`
                          //     },
                          //     body: JSON.stringify({
                          //       actionBy: getCurrentUserId(),
                          //       comments: sendBackComments
                          //     })
                          //   });
                          //
                          //   if (!response.ok) {
                          //     throw new Error('Failed to send back request');
                          //   }
                          //
                          //   // The SAME request status might change or stay sent-back with new comments
                          //   toast.success('Request sent back to advertiser for reconsideration');
                          //   await refreshRequests();
                          //   setSendBackComments("");
                          //
                          // } catch (error) {
                          //   console.error('Error sending back request:', error);
                          //   toast.error('Failed to send back request. Please try again.');
                          // } finally {
                          //   setIsLoading(false);
                          // }
                        }}
                      >
                        Reject and Send Back
                      </Button>
                    </div>
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
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
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
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          ) : null}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}
