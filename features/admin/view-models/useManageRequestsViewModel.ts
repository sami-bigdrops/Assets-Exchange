"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { fetchRequests } from "../services/requests.client";
import type { CreativeRequest } from "../types/request.types";

export function useManageRequestsViewModel() {
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshCounter = useRef(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchRequests({ page: 1, limit: 1000 });
      // Force new array reference to trigger re-render
      setRequests([...(res.data || [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    refreshCounter.current += 1;
    setIsLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [load]);

  return {
    requests,
    isLoading,
    error,
    refresh,
  };
}
