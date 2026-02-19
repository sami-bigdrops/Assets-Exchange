"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { fetchPublishers, createPublisher, updatePublisher, deletePublisher, PublisherFilters } from "@/features/admin/services/publishers.client";
import type { Publisher, PublishersResponse } from "@/features/admin/types/publisher.types";

export function usePublisherViewModel() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState<PublisherFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (newFilters: PublisherFilters = {}) => {
    try {
      setIsLoading(true);
      // Merge with existing filters if needed, but usually UI controls them fully.
      // Here we assume newFilters replaces current filters for the fetch.
      const response = await fetchPublishers(newFilters);
      setPublishers(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages
      });
      setFilters(newFilters);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch publishers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    return load(filters);
  }, [load, filters]);

  const onCreate = async (data: { name: string; contactEmail?: string; platform?: string }) => {
    try {
      await createPublisher(data)
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  const onUpdate = async (id: string, updates: Partial<Publisher>) => {
    try {
      await updatePublisher(id, updates)
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  const onDelete = async (id: string) => {
    try {
      await deletePublisher(id)
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  return {
    publishers,
    pagination,
    isLoading,
    error,
    load, // Use this to change filters/page
    refresh, // Use this to reload current view
    onCreate,
    onUpdate,
    onDelete
  };
}
