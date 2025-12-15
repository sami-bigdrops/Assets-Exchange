"use client";

import { useEffect, useState } from "react";

import { getRequests } from "../services/request.service";
import type { Request } from "../types/admin.types";

export function useRequestsViewModel() {
  const [data, setData] = useState<Request[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const requestsData = await getRequests();
        setData(requestsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load requests data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}
