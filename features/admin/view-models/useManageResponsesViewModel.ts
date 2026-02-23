"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { fetchRequests } from "@/features/admin/services/requests.client";
import { fetchAdvertiserRequests } from "@/features/advertiser/services/requests.client";

import type { CreativeRequest, RequestStatus } from "../types/request.types";

export function useManageResponsesViewModel(isAdvertiserView: boolean = false) {
  const [responses, setResponses] = useState<CreativeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshCounter = useRef(0);

  const load = useCallback(async () => {
    try {
      setError(null);

      const fetcher = isAdvertiserView
        ? fetchAdvertiserRequests
        : fetchRequests;
      const res = await fetcher({
        page: 1,
        limit: 1000,
      });
      const advertiserResponses = (res.data || []).filter(
        (req) =>
          req.approvalStage === "advertiser" ||
          req.approvalStage === "completed" ||
          req.advertiserStatus != null
      );
      setResponses(advertiserResponses);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch responses"
      );
      setResponses([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdvertiserView]);

  const refresh = useCallback(async () => {
    refreshCounter.current += 1;
    setIsLoading(true);
    await load();
  }, [load]);

  const updateRequestStatus = useCallback(
    (
      requestId: string,
      newStatus: RequestStatus,
      newApprovalStage: "admin" | "advertiser" | "completed"
    ) => {
      setResponses((prev) => {
        if (newApprovalStage !== "advertiser") {
          return prev.filter((req) => req.id !== requestId);
        }
        return prev.map((req) =>
          req.id === requestId
            ? { ...req, status: newStatus, approvalStage: newApprovalStage }
            : req
        );
      });
    },
    []
  );

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [load]);

  return {
    responses,
    isLoading,
    error,
    refresh,
    updateRequestStatus,
  };
}
