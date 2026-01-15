"use client";

import { useEffect, useState, useCallback } from "react";

import { fetchPublishers, createPublisher, updatePublisher, deletePublisher } from "@/features/admin/services/publishers.client";
import type { Publisher } from "@/features/admin/types/publisher.types";

export function usePublisherViewModel() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search?: string) => {
    try {
      setIsLoading(true);
      const data = await fetchPublishers({ search });
      setPublishers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch publishers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onCreate = async (name: string, contactEmail?: string) => {
    try {
      await createPublisher({ name, contactEmail })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  const onUpdate = async (id: string, updates: Partial<Publisher>) => {
    try {
      await updatePublisher(id, updates)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  const onDelete = async (id: string) => {
    try {
      await deletePublisher(id)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  return {
    publishers,
    isLoading,
    error,
    refresh: load,
    onCreate,
    onUpdate,
    onDelete
  };
}
