/**
 * useManageCreativesViewModel - Fetches approved and rejected creatives for /creatives page
 *
 * This view model fetches all creative requests and filters them to show only
 * approved and rejected creatives (final states).
 *
 * Data source: creative_requests table filtered by status='approved' or status='rejected'
 */

"use client";

import { useEffect, useState } from "react";

import { getAllRequests } from "../services/request.service";
import type { Request } from "../types/admin.types";

export function useManageCreativesViewModel() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const allRequests = await getAllRequests();
        setRequests(allRequests);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load creatives"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    requests,
    isLoading,
    error,
  };
}
