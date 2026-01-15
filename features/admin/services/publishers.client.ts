import type { Publisher } from "../types/publisher.types";

export async function fetchPublishers(params: { search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);

    const queryString = q.toString();
    const url = `/api/admin/publishers${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url);
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to fetch publishers");
    }
    const json = await res.json();
    return json.data as Publisher[];
}

export async function createPublisher(data: { name: string; contactEmail?: string }) {
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

export async function updatePublisher(id: string, data: Partial<{ name: string; contactEmail: string; status: "active" | "inactive" }>) {
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
