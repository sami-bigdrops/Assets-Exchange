import { type FetchRequestsOptions } from "@/features/admin/services/requests.client";
import { type RequestListResponse } from "@/features/admin/types/request.types";

export async function fetchAdvertiserRequests(
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

  params.append("_t", Date.now().toString());

  const res = await fetch(`/api/advertiser/responses?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch advertiser requests");
  }

  return res.json();
}
