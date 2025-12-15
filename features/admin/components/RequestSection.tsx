"use client";

import * as Accordion from "@radix-ui/react-accordion";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { Request } from "../types/admin.types";

import { RequestItem } from "./RequestItem";

interface RequestSectionProps {
  request: Request;
}

export function RequestSection({ request }: RequestSectionProps) {
  const variables = getVariables();

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="-mt-6 mb-0 px-6 py-6 gap-4 flex flex-row items-center justify-between"
        style={{ backgroundColor: variables.colors.cardHeaderBackgroundColor }}
      >
        <CardTitle
          className="text-lg font-inter font-medium"
          style={{ color: variables.colors.cardHeaderTextColor }}
        >
          {request.headerTitle}
        </CardTitle>

        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          <Button className="bg-white  h-10.5 w-23 font-inter font-medium rounded-[6px]">
            <span className="text-[#2563EB] text-[0.95rem]">
              {request.buttonTitle}
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion.Root type="single" collapsible className="space-y-4">
          {request.requestHeader.map((header, index) => {
            const viewRequest = request.viewRequests[index];
            const approveRequest = request.approveRequest[index];
            const rejectRequest = request.rejectRequest[index];

            if (!viewRequest || !approveRequest || !rejectRequest) {
              return null;
            }

            return (
              <RequestItem
                key={`${request.id}-${index}`}
                requestId={`${request.id}-${index}`}
                requestHeader={header}
                viewRequest={viewRequest}
                approveRequest={approveRequest}
                rejectRequest={rejectRequest}
              />
            );
          })}
        </Accordion.Root>
      </CardContent>
    </Card>
  );
}
