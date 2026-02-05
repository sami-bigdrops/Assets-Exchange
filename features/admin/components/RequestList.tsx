"use client";

import { useManageRequestsViewModel } from "../hooks/useManageRequestsViewModel";

export function RequestList() {
  const { data, loading, error, meta, mutating, onApprove, onReject, reload } =
    useManageRequestsViewModel();

  if (loading && data.length === 0) return <div>Loading...</div>;
  if (error)
    return (
      <div className="text-red-500">
        Error: {error}{" "}
        <button onClick={() => reload()} className="underline">
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Creative Requests</h2>
        <span className="text-sm text-gray-500">
          {meta?.total ?? 0} total requests
        </span>
      </div>

      <div className="space-y-2">
        {data.map((r) => (
          <div
            key={r.id}
            className="border rounded p-3 flex justify-between items-center bg-white shadow-sm"
          >
            <div>
              <div className="font-medium">{r.offerName}</div>
              <div className="text-sm text-gray-500">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                    r.status === "new"
                      ? "bg-blue-100 text-blue-800"
                      : r.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : r.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {r.status.toUpperCase()}
                </span>
                {r.approvalStage}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Submitted:{" "}
                {new Date(r.date).toLocaleDateString("en-US", {
                  timeZone: "America/Los_Angeles",
                })}
              </div>
            </div>
            <div className="flex gap-2">
              {r.status === "new" && r.approvalStage === "admin" && (
                <>
                  <button
                    onClick={() => onApprove(r.id)}
                    disabled={mutating}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("Rejection reason?");
                      if (reason) onReject(r.id, reason);
                    }}
                    disabled={mutating}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                  >
                    Reject
                  </button>
                </>
              )}
              {r.status !== "new" && (
                <span className="text-gray-400 text-sm italic">
                  {r.status === "pending" ? "Waiting for Advertiser" : r.status}
                </span>
              )}
            </div>
          </div>
        ))}

        {data.length === 0 && !loading && (
          <div className="text-gray-500 text-center py-8">
            No requests found.
          </div>
        )}
      </div>
    </div>
  );
}
