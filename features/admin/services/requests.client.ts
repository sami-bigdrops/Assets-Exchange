import {
  type CreativeRequest,
  type RequestListResponse,
} from "../types/request.types";

export interface FetchRequestsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  approvalStage?: string;
  sort?: string;
}

export async function fetchRequests(
  options: FetchRequestsOptions = {}
): Promise<RequestListResponse> {
  const params = new URLSearchParams();
  if (options.page) params.append("page", options.page.toString());
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.search) params.append("search", options.search);
  if (options.status) params.append("status", options.status);
  if (options.approvalStage)
    params.append("approvalStage", options.approvalStage);
  if (options.sort) params.append("sort", options.sort);

  // Add cache-busting timestamp to ensure fresh data
  params.append("_t", Date.now().toString());

  const res = await fetch(`/api/admin/requests?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch requests");
  }

  return res.json();
}

export async function getRequest(id: string): Promise<CreativeRequest> {
  const res = await fetch(`/api/admin/requests/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch request");
  }

  return res.json();
}

export async function updateRequest(
  id: string,
  updates: Partial<CreativeRequest>
): Promise<CreativeRequest> {
  const res = await fetch(`/api/admin/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update request");
  }

  return res.json();
}
