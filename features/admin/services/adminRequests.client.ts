export async function fetchAdminRequests(params: {
  page: number;
  limit: number;
  status?: string;
  approvalStage?: string;
  search?: string;
}) {
  const q = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      q.set(k, String(v));
    }
  });

  // Add cache-busting timestamp
  q.set("_t", Date.now().toString());

  // Ensure query params are properly encoded
  const queryString = q.toString();
  const url = `/api/admin/requests${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Failed to fetch requests");
  }
  return res.json();
}

export async function approveRequest(id: string) {
  const res = await fetch(`/api/admin/requests/${id}/approve`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Approve failed");
  }
}

export async function rejectRequest(id: string, reason: string) {
  const res = await fetch(`/api/admin/requests/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Reject failed");
  }
}

export async function forwardRequest(id: string) {
  const res = await fetch(`/api/admin/requests/${id}/forward`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Forward failed");
  }
}

export async function returnRequest(id: string, feedback: string) {
  const res = await fetch(`/api/admin/requests/${id}/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Return failed");
  }
}
