"use client";

import * as Accordion from "@radix-ui/react-accordion";

import type { Request } from "../types/admin.types";

import { RequestItem } from "./RequestItem";

interface RequestSectionProps {
  requests: Request[];
  startIndex?: number;
  viewButtonText?: string;
  showDownloadButton?: boolean;
}

export function RequestSection({
  requests,
  startIndex = 0,
  viewButtonText,
  showDownloadButton,
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
          />
        );
      })}
    </Accordion.Root>
  );
}
