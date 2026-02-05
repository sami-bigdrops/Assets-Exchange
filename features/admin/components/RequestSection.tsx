"use client";

import * as Accordion from "@radix-ui/react-accordion";

import type {
  ApprovalStage,
  CreativeRequest,
  RequestStatus,
} from "../types/request.types";

import { RequestItem } from "./RequestItem";

interface RequestSectionProps {
  requests: CreativeRequest[];
  startIndex?: number;
  viewButtonText?: string;
  showDownloadButton?: boolean;
  onRefresh?: () => void;
  onStatusUpdate?: (
    requestId: string,
    newStatus: RequestStatus,
    newApprovalStage: ApprovalStage
  ) => void;
  isAdvertiserView?: boolean;
}

export function RequestSection({
  requests,
  startIndex = 0,
  viewButtonText,
  showDownloadButton,
  onRefresh,
  onStatusUpdate,
  isAdvertiserView = false,
}: RequestSectionProps) {
  return (
    <Accordion.Root type="single" collapsible className="space-y-4">
      {requests.map((request, index) => {
        const globalIndex = startIndex + index;

        return (
          <RequestItem
            key={request.id}
            request={request}
            colorVariant={globalIndex % 2 === 0 ? "purple" : "blue"}
            viewButtonText={viewButtonText}
            showDownloadButton={showDownloadButton}
            onRefresh={onRefresh}
            onStatusUpdate={onStatusUpdate}
            isAdvertiserView={isAdvertiserView}
          />
        );
      })}
    </Accordion.Root>
  );
}
