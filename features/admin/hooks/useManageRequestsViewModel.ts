import { useEffect, useState } from "react"

import { fetchAdminRequests, approveRequest, rejectRequest } from "../services/adminRequests.client"
import type { CreativeRequest } from "../types/request.types" // Ensure type import

export function useManageRequestsViewModel() {
    const [data, setData] = useState<CreativeRequest[]>([])
    const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [mutating, setMutating] = useState(false) // For disabling buttons

    async function load(params = { page: 1, limit: 20 }) {
        try {
            setLoading(true)
            setError(null)
            const res = await fetchAdminRequests(params)
            setData(res.data)
            setMeta(res.meta)
        } catch (e: unknown) {
            console.error("Load failed", e);
            setError(e instanceof Error ? e.message : "Failed to load requests")
        } finally {
            setLoading(false)
        }
    }

    async function onApprove(id: string) {
        if (mutating) return;
        try {
            setMutating(true)
            await approveRequest(id)
            await load(meta ? { page: meta.page, limit: meta.limit } : undefined)
        } catch (e: unknown) {
            alert("Approve failed: " + (e instanceof Error ? e.message : String(e))); 
        } finally {
            setMutating(false)
        }
    }

    async function onReject(id: string, reason: string) {
        if (mutating) return;
        try {
            setMutating(true)
            await rejectRequest(id, reason)
            await load(meta ? { page: meta.page, limit: meta.limit } : undefined)
        } catch (e: unknown) {
            alert("Reject failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setMutating(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    return {
        data,
        meta,
        loading,
        error,
        mutating,
        onApprove,
        onReject,
        reload: load,
    }
}
