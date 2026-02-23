import type { Advertiser } from "../types/advertiser.types";

export async function fetchAdvertisers(params: { search?: string } = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);

  const queryString = q.toString();
  const url = `/api/admin/advertisers${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch advertisers");
  }
  const json = await res.json();
  return json.data as Advertiser[];
}

export async function createAdvertiser(data: {
  id?: string;
  name: string;
  contactEmail?: string;
}) {
  const res = await fetch("/api/admin/advertisers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to create advertiser");
  }
  return res.json() as Promise<Advertiser>;
}

export async function updateAdvertiser(
  id: string,
  data: Partial<{
    name: string;
    contactEmail: string | null;
    status: "active" | "inactive" | "Active" | "Inactive";
    password: string;
  }>
) {
  const res = await fetch(`/api/admin/advertisers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to update advertiser");
  }
  return res.json() as Promise<Advertiser>;
}

export async function deleteAdvertiser(id: string) {
  const res = await fetch(`/api/admin/advertisers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to delete advertiser");
  }
}

export async function getAdvertiser(id: string) {
  const res = await fetch(`/api/admin/advertisers/${id}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch advertiser");
  }
  return res.json() as Promise<Advertiser>;
}
