import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { bulkDeleteByIds, parseIdsFromUrl } from "@/lib/filesClient";

export interface CreativeFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type?: string;
  html?: boolean;
  previewUrl?: string;
  source?: "single" | "zip";
  uploadId?: string;
  embeddedHtml?: string;
}

interface UseMultipleCreativesModalProps {
  isOpen: boolean;
  creatives: CreativeFile[];
  onRemoveCreative?: (creativeId: string) => void;
  onFileNameChange?: (fileId: string, newFileName: string) => void;
  onZipFileNameChange?: (newZipFileName: string) => void;
  creativeType?: string;
}

export const useMultipleCreativesModal = ({
  isOpen,
  creatives,
  onRemoveCreative,
  onFileNameChange,
  onZipFileNameChange,
  creativeType: _creativeType = "email",
}: UseMultipleCreativesModalProps) => {
  const [selectedCreative, setSelectedCreative] = useState<CreativeFile | null>(
    null
  );
  const [isSingleCreativeViewOpen, setIsSingleCreativeViewOpen] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<Record<string, string>>({});
  const [isHtmlEditorFullscreen, setIsHtmlEditorFullscreen] = useState(false);
  const [isImagePreviewFullscreen, setIsImagePreviewFullscreen] =
    useState(false);
  const [currentEditingCreative, setCurrentEditingCreative] =
    useState<CreativeFile | null>(null);

  // ZIP file name editing state
  const [isEditingZipFileName, setIsEditingZipFileName] = useState(false);
  const [editableZipFileName, setEditableZipFileName] = useState("");
  const [editableZipNameOnly, setEditableZipNameOnly] = useState("");

  // Load HTML content for HTML creatives
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const loadHtmlContent = async (creative: CreativeFile) => {
      // Skip if already loaded
      if (htmlContent[creative.id]) return;

      const isHtml = creative.html || /\.html?$/i.test(creative.name);
      if (!isHtml) return;

      try {
        // Check for embedded HTML first
        if ((creative as { embeddedHtml?: string }).embeddedHtml) {
          const embedded = (creative as { embeddedHtml?: string })
            .embeddedHtml!;
          if (embedded && embedded.length > 0) {
            setHtmlContent((prev) => ({ ...prev, [creative.id]: embedded }));
            return;
          }
        }

        // Try API endpoint first
        try {
          const encodedFileUrl = encodeURIComponent(creative.url);
          let apiUrl = `/api/files?fileId=${creative.id}&fileUrl=${encodedFileUrl}&processAssets=true`;
          if (creative.uploadId) {
            apiUrl += `&uploadId=${encodeURIComponent(creative.uploadId)}`;
          }

          const apiResponse = await fetch(apiUrl, {
            method: "GET",
            headers: {
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });

          if (apiResponse.ok) {
            const htmlText = await apiResponse.text();
            if (htmlText) {
              setHtmlContent((prev) => ({ ...prev, [creative.id]: htmlText }));
              return;
            }
          }
        } catch (apiError) {
          // API fetch failed, try fallback
          console.warn("API fetch failed for creative:", creative.id, apiError);
        }

        // Fallback to direct fetch - only for absolute URLs (not relative paths)
        // Skip relative paths as they won't work with CORS
        if (
          creative.url &&
          (creative.url.startsWith("http://") ||
            creative.url.startsWith("https://"))
        ) {
          try {
            // Use AbortController for timeout compatibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const directResponse = await fetch(creative.url, {
              method: "GET",
              headers: {
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              },
              mode: "cors",
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (directResponse.ok) {
              const htmlText = await directResponse.text();
              if (htmlText) {
                setHtmlContent((prev) => ({
                  ...prev,
                  [creative.id]: htmlText,
                }));
                return;
              }
            }
          } catch (fetchError) {
            // Silently fail - this is a fallback, so it's okay if it fails
            // Only log if it's not a timeout or abort error
            if (
              fetchError instanceof Error &&
              fetchError.name !== "AbortError" &&
              !fetchError.message.includes("aborted")
            ) {
              console.warn(
                "Direct fetch failed for creative:",
                creative.id,
                fetchError.message
              );
            }
          }
        }
      } catch (error) {
        // Catch any unexpected errors
        if (error instanceof Error) {
          console.warn(
            "Failed to load HTML content for creative:",
            creative.id,
            error.message
          );
        }
      }
    };

    // Load HTML content for each creative
    creatives.forEach((creative) => {
      loadHtmlContent(creative).catch((error) => {
        // Ensure no unhandled promise rejections
        console.warn(
          "Unhandled error loading HTML for creative:",
          creative.id,
          error
        );
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, creatives]);

  const openSingleCreativeView = useCallback((creative: CreativeFile) => {
    setSelectedCreative(creative);
    setIsSingleCreativeViewOpen(true);
  }, []);

  const closeSingleCreativeView = useCallback(() => {
    setIsSingleCreativeViewOpen(false);
    setSelectedCreative(null);
  }, []);

  const handleFileNameChangeFromSingle = useCallback(
    (fileId: string, newFileName: string) => {
      onFileNameChange?.(fileId, newFileName);
    },
    [onFileNameChange]
  );

  const handleDeleteCreative = useCallback(
    async (creative: CreativeFile) => {
      if (!confirm(`Are you sure you want to delete "${creative.name}"?`)) {
        return;
      }

      try {
        setIsDeleting(creative.id);

        const ids = new Set<string>();
        ids.add(creative.id);

        if (creative.url) {
          ids.add(creative.url);
        }

        if (creative.previewUrl) {
          const previewId = parseIdsFromUrl(creative.previewUrl).id;
          if (previewId) ids.add(previewId);
        }

        await bulkDeleteByIds(Array.from(ids));

        // Remove HTML content from state
        setHtmlContent((prev) => {
          const updated = { ...prev };
          delete updated[creative.id];
          return updated;
        });

        onRemoveCreative?.(creative.id);

        // Close single view if deleting the selected creative
        if (selectedCreative?.id === creative.id) {
          closeSingleCreativeView();
        }
      } catch (error) {
        console.error("Failed to delete creative:", error);
        alert("Failed to delete creative. Please try again.");
      } finally {
        setIsDeleting(null);
      }
    },
    [onRemoveCreative, selectedCreative, closeSingleCreativeView]
  );

  const handleSaveHtml = useCallback(
    async (creativeId: string, html: string) => {
      try {
        // Save HTML content
        const response = await fetch("/api/creative/metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creativeId,
            htmlContent: html,
            metadata: {
              lastSaved: new Date().toISOString(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save HTML");
        }

        // Update local state
        setHtmlContent((prev) => ({ ...prev, [creativeId]: html }));
      } catch (error) {
        console.error("Failed to save HTML:", error);
        throw error;
      }
    },
    []
  );

  const toggleHtmlEditorFullscreen = useCallback((creative?: CreativeFile) => {
    if (creative) {
      setCurrentEditingCreative(creative);
    }
    setIsHtmlEditorFullscreen((prev) => !prev);
  }, []);

  const toggleImagePreviewFullscreen = useCallback(() => {
    setIsImagePreviewFullscreen((prev) => !prev);
  }, []);

  const getFileType = useCallback(
    (fileName: string): "image" | "html" | "other" => {
      const lowerName = fileName.toLowerCase();
      if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lowerName)) {
        return "image";
      }
      if (/\.(html|htm)$/i.test(lowerName)) {
        return "html";
      }
      return "other";
    },
    []
  );

  const handleZipFileNameEdit = useCallback((currentZipFileName: string) => {
    const lastDotIndex = currentZipFileName.lastIndexOf(".");
    setEditableZipNameOnly(
      lastDotIndex > 0
        ? currentZipFileName.substring(0, lastDotIndex)
        : currentZipFileName
    );
    setIsEditingZipFileName(true);
  }, []);

  const handleZipFileNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, currentZipFileName: string) => {
      const nameOnly = e.target.value;
      setEditableZipNameOnly(nameOnly);
      const extension = currentZipFileName.substring(
        currentZipFileName.lastIndexOf(".")
      );
      setEditableZipFileName(nameOnly + extension);
    },
    []
  );

  const handleZipFileNameSave = useCallback(
    (currentZipFileName: string) => {
      const nameOnly = editableZipNameOnly.trim();
      if (!nameOnly) return;

      const originalExtension = currentZipFileName.substring(
        currentZipFileName.lastIndexOf(".")
      );
      const newZipFileName = nameOnly + originalExtension;

      if (currentZipFileName === newZipFileName) {
        setIsEditingZipFileName(false);
        return;
      }

      onZipFileNameChange?.(newZipFileName);
      setIsEditingZipFileName(false);
    },
    [editableZipNameOnly, onZipFileNameChange]
  );

  const handleZipFileNameCancel = useCallback((currentZipFileName: string) => {
    setEditableZipFileName(currentZipFileName);
    const lastDotIndex = currentZipFileName.lastIndexOf(".");
    setEditableZipNameOnly(
      lastDotIndex > 0
        ? currentZipFileName.substring(0, lastDotIndex)
        : currentZipFileName
    );
    setIsEditingZipFileName(false);
  }, []);

  const handleZipFileNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, currentZipFileName: string) => {
      if (e.key === "Enter") {
        handleZipFileNameSave(currentZipFileName);
      } else if (e.key === "Escape") {
        handleZipFileNameCancel(currentZipFileName);
      }
    },
    [handleZipFileNameSave, handleZipFileNameCancel]
  );

  return {
    selectedCreative,
    isSingleCreativeViewOpen,
    isDeleting,
    htmlContent,
    isHtmlEditorFullscreen,
    isImagePreviewFullscreen,
    currentEditingCreative,
    isEditingZipFileName,
    editableZipFileName,
    editableZipNameOnly,
    openSingleCreativeView,
    closeSingleCreativeView,
    handleFileNameChangeFromSingle,
    handleDeleteCreative,
    handleSaveHtml,
    toggleHtmlEditorFullscreen,
    toggleImagePreviewFullscreen,
    getFileType,
    setHtmlContent,
    handleZipFileNameEdit,
    handleZipFileNameChange,
    handleZipFileNameSave,
    handleZipFileNameCancel,
    handleZipFileNameKeyDown,
  };
};
