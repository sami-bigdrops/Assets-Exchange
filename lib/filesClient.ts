/**
 * Parse file IDs from a URL
 */
export const parseIdsFromUrl = (url: string): { id: string; url: string } => {
  // Extract ID from URL - this is a simple implementation
  // Adjust based on your actual URL structure
  const match = url.match(/\/([^\/]+)$/);
  const id = match ? match[1] : url;
  return { id, url };
};

/**
 * Bulk delete files by their IDs
 */
export const bulkDeleteByIds = async (ids: string[]): Promise<void> => {
  try {
    const response = await fetch("/api/files/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to delete files");
    }
  } catch (error) {
    console.error("Bulk delete error:", error);
    throw error;
  }
};
