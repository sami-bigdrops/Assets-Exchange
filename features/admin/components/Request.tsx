/**
 * Request Component - Dashboard widget for "Incoming Publisher Requests"
 *
 * UNIFIED MODEL:
 * Displays the 3 most recent creative submissions from publishers.
 * These are requests that need admin review or are in various states.
 *
 * Data Source: Same creative_requests table, showing recent submissions
 * View All: Links to /requests page for complete management
 */

"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchRequests } from "../services/requests.client";
import type {
  ApprovalStage,
  CreativeRequest,
  RequestStatus,
} from "../types/request.types";

import { RequestSection } from "./RequestSection";

export function Request() {
  const variables = getVariables();
  const [isHovered, setIsHovered] = useState(false);
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchRequests({
          page: 1,
          limit: 3,
          sort: "submittedAt:desc",
        });
        setRequests(res.data || []);
      } catch (error) {
        console.error("Failed to fetch recent requests:", error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const updateRequestStatus = useCallback(
    (
      requestId: string,
      newStatus: RequestStatus,
      newApprovalStage: ApprovalStage
    ) => {
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status: newStatus, approvalStage: newApprovalStage }
            : req
        )
      );
    },
    []
  );

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader
          className="-mt-6 mb-0 px-6 py-6"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <CardTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-medium"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Incoming Publisher Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader
          className="-mt-6 mb-0 px-6 py-6"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <CardTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-medium"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Incoming Publisher Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">No requests available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="-mt-6 mb-0 px-6 py-6 gap-4 flex flex-row items-center justify-between"
        style={{ backgroundColor: variables.colors.cardHeaderBackgroundColor }}
      >
        <CardTitle
          className="xl:text-lg text-sm lg:text-base font-inter font-medium"
          style={{ color: variables.colors.cardHeaderTextColor }}
        >
          Incoming Publisher Requests
        </CardTitle>

        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          <Link href="/requests">
            <Button
              className="md:h-8.5 md:w-20 lg:h-9.5 lg:w-21.5 xl:h-10.5 xl:w-23 font-inter font-medium rounded-[6px] transition-colors"
              style={{
                backgroundColor: isHovered ? "#FFFFFF" : "#FFFFFF",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <span
                className="text-xs lg:text-sm font-medium xl:text-[0.95rem]"
                style={{
                  color: isHovered ? "#2563EB" : "#2563EB",
                }}
              >
                View All
              </span>
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <RequestSection
          requests={requests}
          onStatusUpdate={updateRequestStatus}
        />
      </CardContent>
    </Card>
  );
}
