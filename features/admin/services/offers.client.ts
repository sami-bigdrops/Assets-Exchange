import type { Offer } from "../types/offer.types";

export async function fetchOffers(params: { search?: string; status?: "Active" | "Inactive" } = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);

  const queryString = q.toString();
  const url = `/api/admin/offers${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch offers");
  }
  const json = await res.json();
  return json.data as Offer[];
}

export async function createOffer(data: { id: string; name: string; advertiserId: string; status?: string; visibility?: string; brandGuidelinesFileId?: string }) {
  const res = await fetch("/api/admin/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to create offer");
  }
  return res.json() as Promise<Offer>;
}

export async function updateOffer(id: string, data: Partial<{ name: string; status: "active" | "inactive"; visibility: "Public" | "Internal" | "Hidden"; advertiserId: string; brandGuidelinesFileId: string | null }>) {
  const res = await fetch(`/api/admin/offers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to update offer");
  }
  return res.json() as Promise<Offer>;
}

export async function deleteOffer(id: string) {
  const res = await fetch(`/api/admin/offers/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to delete offer");
  }
}

export async function getOffer(id: string) {
  const res = await fetch(`/api/admin/offers/${id}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch offer");
  }
  return res.json() as Promise<Offer>;
}

export async function attachBrandGuidelines(offerId: string, fileId: string) {
  const res = await fetch(`/api/admin/offers/${offerId}/brand-guidelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to attach brand guidelines");
  }
}

export async function detachBrandGuidelines(offerId: string) {
  const res = await fetch(`/api/admin/offers/${offerId}/brand-guidelines`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to detach brand guidelines");
  }
}

export async function bulkUpdateOffers(
  offerIds: string[],
  updates: {
    visibility?: "Public" | "Internal" | "Hidden";
    brandGuidelines?: {
      type: "url" | "file" | "text";
      url?: string;
      file?: File;
      text?: string;
      notes?: string;
    };
  }
): Promise<{
  success: boolean;
  updated: number;
  failed: number;
  results: {
    successful: string[];
    failed: Array<{ offerId: string; error: string; reason: string }>;
  };
  message: string;
}> {
  const formData = new FormData();
  formData.append('offerIds', JSON.stringify(offerIds));

  if (updates.visibility) {
    formData.append('visibility', updates.visibility);
  }

  if (updates.brandGuidelines) {
    formData.append('brandGuidelinesType', updates.brandGuidelines.type);

    if (updates.brandGuidelines.type === 'file' && updates.brandGuidelines.file) {
      formData.append('brandGuidelinesFile', updates.brandGuidelines.file);
    } else if (updates.brandGuidelines.type === 'url' && updates.brandGuidelines.url) {
      formData.append('brandGuidelinesUrl', updates.brandGuidelines.url);
    } else if (updates.brandGuidelines.type === 'text' && updates.brandGuidelines.text) {
      formData.append('brandGuidelinesText', updates.brandGuidelines.text);
    }

    if (updates.brandGuidelines.notes) {
      formData.append('brandGuidelinesNotes', updates.brandGuidelines.notes);
    }
  }

  const res = await fetch('/api/admin/offers/bulk-update', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Failed to update offers');
  }

  return res.json();
}