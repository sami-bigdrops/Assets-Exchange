import { checkProofreadStatus, ProofreadCreativeResponse } from "../../lib/proofreadCreativeClient";

describe("checkProofreadStatus", () => {
  const mockFetch = jest.spyOn(global, "fetch");

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterAll(() => {
    mockFetch.mockRestore();
  });

  it("should return data on successful response", async () => {
    const mockResponse: ProofreadCreativeResponse = {
      success: true,
      status: "completed",
      issues: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await checkProofreadStatus({ taskId: "task-123" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/proofread-creative?taskId=task-123",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should throw error with message from JSON error response", async () => {
    const errorResponse = { error: "Task not found" };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => errorResponse,
      text: async () => JSON.stringify(errorResponse),
    } as Response);

    await expect(checkProofreadStatus({ taskId: "invalid-task" })).rejects.toThrow("Task not found");
  });

  it("should throw error with message from text error response when JSON parsing fails", async () => {
    const errorText = "Internal Server Error";

    // Simulating response.json() failing
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("Invalid JSON");
      },
      text: async () => errorText,
    } as Response);

    await expect(checkProofreadStatus({ taskId: "server-error" })).rejects.toThrow("Internal Server Error");
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(checkProofreadStatus({ taskId: "network-fail" })).rejects.toThrow("Network error");
  });
});
