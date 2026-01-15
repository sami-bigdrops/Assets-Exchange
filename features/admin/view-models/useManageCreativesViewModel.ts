"use client";

import { useEffect, useState, useCallback } from "react";

import { fetchRequests } from "../services/requests.client";
import type { CreativeRequest } from "../types/request.types";

export function useManageCreativesViewModel() {
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchRequests({
        page: 1,
        limit: 100,
        status: "approved,rejected"
      });
      setRequests(res.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load creatives"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    requests,
    isLoading,
    error,
    refresh: load
  };
}
