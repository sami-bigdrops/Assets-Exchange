import type { Publisher, PublishersResponse } from "../types/publisher.types";

export type PublisherFilters = {
    search?: string
    page?: number
    limit?: number
    status?: string
    platform?: string
    createdMethod?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
}

export async function fetchPublishers(params: PublisherFilters = {}) {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", params.page.toString());
    if (params.limit) q.set("limit", params.limit.toString());
    if (params.status) q.set("status", params.status);
    if (params.platform) q.set("platform", params.platform);
    if (params.createdMethod) q.set("createdMethod", params.createdMethod);
    if (params.sortBy) q.set("sortBy", params.sortBy);
    if (params.sortOrder) q.set("sortOrder", params.sortOrder);

    const queryString = q.toString();
    const url = `/api/admin/publishers${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url);
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to fetch publishers");
    }
    const json = await res.json();
    // Support legacy response if any, or new structure
    if (Array.isArray(json.data) && typeof json.total === 'number') {
        return json as PublishersResponse;
    }
    // Fallback if structure is different (though backend update should ensure it)
    return {
        data: (json.data || []) as Publisher[],
        total: (json.data || []).length,
        page: 1,
        limit: (json.data || []).length || 10,
        totalPages: 1
    } as PublishersResponse;
}

export async function createPublisher(data: { name: string; contactEmail?: string; platform?: string }) {
    const res = await fetch("/api/admin/publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to create publisher");
    }
    return res.json() as Promise<Publisher>;
}

export async function updatePublisher(id: string, data: Partial<{ name: string; contactEmail: string | null; status: "active" | "inactive" | "Active" | "Inactive"; platform: string }>) {
    const res = await fetch(`/api/admin/publishers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to update publisher");
    }
    return res.json() as Promise<Publisher>;
}

export async function deletePublisher(id: string) {
    const res = await fetch(`/api/admin/publishers/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to delete publisher");
    }
}

export async function getPublisher(id: string) {
    const res = await fetch(`/api/admin/publishers/${id}`);
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to fetch publisher");
    }
    return res.json() as Promise<Publisher>;
}
