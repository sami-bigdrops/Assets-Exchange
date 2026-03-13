import { bulkDeleteByIds, parseIdsFromUrl } from "../../lib/filesClient";

// Mock global fetch
global.fetch = jest.fn();

describe("filesClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("parseIdsFromUrl", () => {
    it("should extract ID from URL", () => {
      const url = "https://example.com/files/123";
      const result = parseIdsFromUrl(url);
      expect(result).toEqual({ id: "123", url });
    });

    it("should return the full URL if no slash is present", () => {
      const url = "123";
      const result = parseIdsFromUrl(url);
      expect(result).toEqual({ id: "123", url });
    });
  });

  describe("bulkDeleteByIds", () => {
    it("should delete files successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const ids = ["1", "2", "3"];
      await bulkDeleteByIds(ids);

      expect(global.fetch).toHaveBeenCalledWith("/api/files/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
    });

    it("should throw an error with specific message from server", async () => {
      const errorMessage = "Server error message";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMessage }),
      });

      const ids = ["1"];
      await expect(bulkDeleteByIds(ids)).rejects.toThrow(errorMessage);
    });

    it("should throw a default error if server response has no error message", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const ids = ["1"];
      await expect(bulkDeleteByIds(ids)).rejects.toThrow(
        "Failed to delete files"
      );
    });

    it("should throw a default error if server response is not JSON", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const ids = ["1"];
      await expect(bulkDeleteByIds(ids)).rejects.toThrow(
        "Failed to delete files"
      );
    });

    it("should propagate network errors", async () => {
      const networkError = new Error("Network error");
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      const ids = ["1"];
      await expect(bulkDeleteByIds(ids)).rejects.toThrow(networkError);
    });
  });
});
