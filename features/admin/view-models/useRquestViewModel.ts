"use client";

import { useEffect, useState, useCallback } from "react";

import { fetchRequests } from "../services/requests.client";
import type { CreativeRequest } from "../types/request.types";

export function useRequestsViewModel() {
  const [data, setData] = useState<CreativeRequest[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchRequests({ page: 1, limit: 100 });
      setData(res.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load requests data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    isLoading,
    error,
    refresh: load
  };
}
