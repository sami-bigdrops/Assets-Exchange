export interface ResetStuckScanningResponse {
  reset: number;
  ids: string[];
}

export class ResetStuckScanningError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isNetworkError: boolean = false
  ) {
    super(message);
    this.name = "ResetStuckScanningError";
  }
}

export async function resetStuckScanningAssets(): Promise<ResetStuckScanningResponse> {
  try {
    const response = await fetch("/api/ops/creatives/reset-stuck-scanning", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error ||
        errorData.details ||
        "Failed to reset stuck scanning assets";

      if (response.status === 401 || response.status === 403) {
        throw new ResetStuckScanningError(errorMessage, response.status, false);
      }

      if (response.status >= 500) {
        throw new ResetStuckScanningError(errorMessage, response.status, false);
      }

      throw new ResetStuckScanningError(errorMessage, response.status, false);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ResetStuckScanningError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ResetStuckScanningError(
        "Network error: Unable to connect to server",
        undefined,
        true
      );
    }

    throw new ResetStuckScanningError(
      error instanceof Error
        ? error.message
        : "Failed to reset stuck scanning assets",
      undefined,
      true
    );
  }
}
