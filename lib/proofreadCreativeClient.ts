"use client";

export interface ProofreadIssue {
  type: string;
  note?: string;
  original?: string;
  correction?: string;
}

export interface ProofreadSuggestion {
  icon: string;
  type: string;
  description: string;
}

export interface QualityScore {
  grammar: number;
  readability: number;
  conversion: number;
  brandAlignment: number;
}

export interface ProofreadCreativeResponse {
  success: boolean;
  taskId?: string;
  dbTaskId?: string;
  issues?: ProofreadIssue[];
  suggestions?: ProofreadSuggestion[];
  qualityScore?: QualityScore;
  status?: string;
  result?: unknown;
  error?: string;
}

interface ProofreadCreativeParams {
  creativeId: string;
  fileUrl: string;
  htmlContent?: string;
}

interface CheckStatusParams {
  taskId: string;
}

export async function proofreadCreative(
  params: ProofreadCreativeParams
): Promise<ProofreadCreativeResponse> {
  try {
    const response = await fetch("/api/proofread-creative", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      let errorMessage = "Proofreading failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        try {
          const parsed = JSON.parse(errorText);
          errorMessage = parsed.error || parsed.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Proofread creative error:", error);
    throw error;
  }
}

export async function checkProofreadStatus(
  params: CheckStatusParams
): Promise<ProofreadCreativeResponse> {
  try {
    const response = await fetch(
      `/api/proofread-creative?taskId=${params.taskId}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      let errorMessage = "Status check failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        try {
          const parsed = JSON.parse(errorText);
          errorMessage = parsed.error || parsed.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Check proofread status error:", error);
    throw error;
  }
}
