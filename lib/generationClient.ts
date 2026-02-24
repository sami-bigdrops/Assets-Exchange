"use client";

interface GenerateEmailContentParams {
  creativeType: string;
  sampleText: string;
  maxFrom?: number;
  maxSubject?: number;
}

interface GenerateEmailContentResponse {
  fromLines: string[];
  subjectLines: string[];
}

export async function generateEmailContent(
  params: GenerateEmailContentParams
): Promise<GenerateEmailContentResponse> {
  try {
    const response = await fetch("/api/generate-email-content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(
          "API route not found (returned HTML). Check /api/generate-email-content route wiring."
        );
      }
      const errorText = await response.text();
      throw new Error(errorText || "Failed to generate email content");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Generate email content error:", error);
    throw error;
  }
}
