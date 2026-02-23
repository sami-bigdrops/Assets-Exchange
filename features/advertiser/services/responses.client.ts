export async function approveResponse(id: string) {
    const res = await fetch(`/api/advertiser/responses/${id}/approve`, {
        method: "POST",
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Approve failed");
    }
}

export async function rejectResponse(id: string, reason: string) {
    const res = await fetch(`/api/advertiser/responses/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Reject failed");
    }
}

export async function returnResponse(id: string, reason: string) {
    const res = await fetch(`/api/advertiser/responses/${id}/send-back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "Send back failed");
    }
}
