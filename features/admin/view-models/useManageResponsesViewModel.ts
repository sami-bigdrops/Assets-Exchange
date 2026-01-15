"use client";

import { useEffect, useState, useCallback } from "react";

import { fetchRequests } from "../services/requests.client";
import type { CreativeRequest } from "../types/request.types";

export function useManageResponsesViewModel() {
  const [responses, setResponses] = useState<CreativeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchRequests({
        page: 1,
        limit: 1000,
        approvalStage: "advertiser"
      });
      setResponses(res.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch responses"
      );
      setResponses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    responses,
    isLoading,
    error,
    refresh: load
  };
}
