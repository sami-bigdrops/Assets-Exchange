import type React from "react";
import { useState, useEffect, useCallback } from "react";

import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import {
  saveHtml,
  renameCreative,
  saveCreativeMetadata,
  getCreativeMetadata,
} from "@/lib/creativeClient";
import { generateEmailContent } from "@/lib/generationClient";
import { proofreadCreative } from "@/lib/proofreadCreativeClient";
import { type ProofreadCreativeResponse } from "@/lib/proofreadCreativeClient";

export interface Creative {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  previewUrl?: string;
  html?: boolean;
  uploadId?: string;
  embeddedHtml?: string;
}

interface UseSingleCreativeViewModalProps {
  isOpen: boolean;
  creative: Creative;
  onClose: () => void;
  onFileNameChange?: (fileId: string, newFileName: string) => void;
  onMetadataChange?: (
    fileId: string,
    metadata: { fromLines?: string; subjectLines?: string }
  ) => void;
  showAdditionalNotes?: boolean;
  creativeType?: string;
}

export const useSingleCreativeViewModal = ({
  isOpen,
  creative,
  onClose,
  onFileNameChange,
  onMetadataChange,
  showAdditionalNotes: _showAdditionalNotes = false,
  creativeType: _creativeType = "email",
}: UseSingleCreativeViewModalProps) => {
  const [editableFileName, setEditableFileName] = useState(creative.name);
  const [editableNameOnly, setEditableNameOnly] = useState(() => {
    const lastDotIndex = creative.name.lastIndexOf(".");
    return lastDotIndex > 0
      ? creative.name.substring(0, lastDotIndex)
      : creative.name;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [fromLines, setFromLines] = useState("");
  const [subjectLines, setSubjectLines] = useState("");
  const [isHtmlEditorFullscreen, setIsHtmlEditorFullscreen] = useState(false);
  const [isImagePreviewFullscreen, setIsImagePreviewFullscreen] =
    useState(false);
  const [isHtmlPreviewFullscreen, setIsHtmlPreviewFullscreen] = useState(false);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [proofreadingData, setProofreadingData] =
    useState<ProofreadCreativeResponse | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false); // Default to false (show marked/corrections) - for preview
  const [showOriginalFullscreen, setShowOriginalFullscreen] = useState(false); // Separate state for fullscreen image view
  const [showOriginalHtmlFullscreen, setShowOriginalHtmlFullscreen] = useState(false); // Separate state for fullscreen HTML view

  // Helper function to extract marked image URL from proofreading result
  const getMarkedImageUrl = useCallback((): string | null => {
    if (!proofreadingData?.result || typeof proofreadingData.result !== "object") {
      return null;
    }
    const result = proofreadingData.result as Record<string, unknown>;
    
    // Check direct properties
    if (result.corrected_file_url && typeof result.corrected_file_url === "string") {
      return result.corrected_file_url;
    }
    if (result.annotated_image_url && typeof result.annotated_image_url === "string") {
      return result.annotated_image_url;
    }
    if (result.marked_image_url && typeof result.marked_image_url === "string") {
      return result.marked_image_url;
    }
    
    // Check nested result structure (result.result.corrected_file_url)
    if (result.result && typeof result.result === "object") {
      const nestedResult = result.result as Record<string, unknown>;
      if (nestedResult.corrected_file_url && typeof nestedResult.corrected_file_url === "string") {
        return nestedResult.corrected_file_url;
      }
      if (nestedResult.annotated_image_url && typeof nestedResult.annotated_image_url === "string") {
        return nestedResult.annotated_image_url;
      }
      if (nestedResult.marked_image_url && typeof nestedResult.marked_image_url === "string") {
        return nestedResult.marked_image_url;
      }
    }
    
    return null;
  }, [proofreadingData]);

  // Helper function to extract marked HTML content from proofreading result
  const getMarkedHtmlContent = useCallback((): string | null => {
    if (!proofreadingData?.result || typeof proofreadingData.result !== "object") {
      return null;
    }
    const result = proofreadingData.result as Record<string, unknown>;
    
    // Check direct properties
    if (result.corrected_html && typeof result.corrected_html === "string") {
      return result.corrected_html;
    }
    if (result.annotated_html && typeof result.annotated_html === "string") {
      return result.annotated_html;
    }
    if (result.marked_html && typeof result.marked_html === "string") {
      return result.marked_html;
    }
    
    // Check nested result structure (result.result.corrected_html)
    if (result.result && typeof result.result === "object") {
      const nestedResult = result.result as Record<string, unknown>;
      if (nestedResult.corrected_html && typeof nestedResult.corrected_html === "string") {
        return nestedResult.corrected_html;
      }
      if (nestedResult.annotated_html && typeof nestedResult.annotated_html === "string") {
        return nestedResult.annotated_html;
      }
      if (nestedResult.marked_html && typeof nestedResult.marked_html === "string") {
        return nestedResult.marked_html;
      }
    }
    
    return null;
  }, [proofreadingData]);

  const loadExistingCreativeData = useCallback(async () => {
    try {
      const data = await getCreativeMetadata(creative.id);
      if (data.success && data.metadata) {
        const loadedFromLines = data.metadata.fromLines || "";
        const loadedSubjectLines = data.metadata.subjectLines || "";
        setFromLines(loadedFromLines);
        setSubjectLines(loadedSubjectLines);
        if (
          data.metadata.proofreadingData &&
          typeof data.metadata.proofreadingData === "object" &&
          Object.keys(data.metadata.proofreadingData).length > 0
        ) {
          setProofreadingData(
            data.metadata.proofreadingData as ProofreadCreativeResponse
          );
        }
        if (data.metadata.htmlContent) {
          setHtmlContent(data.metadata.htmlContent);
        }
        if (data.metadata.additionalNotes) {
          setAdditionalNotes(data.metadata.additionalNotes);
        }
        if (loadedFromLines || loadedSubjectLines) {
          onMetadataChange?.(creative.id, {
            fromLines: loadedFromLines,
            subjectLines: loadedSubjectLines,
          });
        }
      }
    } catch (_error) {
      console.error("No existing data found for creative:", creative.id);
    }
  }, [creative.id, onMetadataChange]);

  useEffect(() => {
    if (isOpen && creative.id) {
      loadExistingCreativeData();
    }
  }, [isOpen, creative.id, loadExistingCreativeData]);

  useEffect(() => {
    if (isOpen) {
      setEditableFileName(creative.name);
      const lastDotIndex = creative.name.lastIndexOf(".");
      setEditableNameOnly(
        lastDotIndex > 0
          ? creative.name.substring(0, lastDotIndex)
          : creative.name
      );
    }
  }, [isOpen, creative.name]);

  const fetchHtmlContent = useCallback(async () => {
    try {
      if (
        (creative as { embeddedHtml?: string }).embeddedHtml &&
        (creative as { embeddedHtml?: string }).embeddedHtml!.length > 0
      ) {
        setHtmlContent((creative as { embeddedHtml?: string }).embeddedHtml!);
        return;
      }

      const encodedFileUrl = encodeURIComponent(creative.url);
      let apiUrl = `${API_ENDPOINTS.GET_FILE_CONTENT}?fileId=${creative.id}&fileUrl=${encodedFileUrl}&processAssets=true`;
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
        setHtmlContent(htmlText);
        return;
      }

      const directResponse = await fetch(creative.url, {
        method: "GET",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        mode: "cors",
      });

      if (directResponse.ok) {
        const htmlText = await directResponse.text();
        setHtmlContent(htmlText);
      } else {
        await tryAlternativeHtmlLoading();
      }
    } catch (error) {
      console.error("Error fetching HTML:", error);
      await tryAlternativeHtmlLoading();
    }
  }, [creative]);

  const tryAlternativeHtmlLoading = async () => {
    const fallbackContent = `<!-- HTML Content Loading Failed -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Creative Editor</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .message {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ff6b6b;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="message">
        <h3>⚠️ Unable to load original HTML content</h3>
        <p>You can start editing by replacing this content with your HTML code.</p>
    </div>
</body>
</html>`;
    setHtmlContent(fallbackContent);
  };

  useEffect(() => {
    if (
      isOpen &&
      creative.type &&
      (creative.type.includes("html") ||
        creative.name.toLowerCase().includes(".html"))
    ) {
      fetchHtmlContent();
    }
  }, [isOpen, creative.type, creative.name, fetchHtmlContent]);

  const handleSaveAll = useCallback(async () => {
    try {
      setIsSaving(true);
      await saveCreativeMetadata({
        creativeId: creative.id,
        fromLines,
        subjectLines,
        proofreadingData: proofreadingData || undefined,
        htmlContent,
        additionalNotes,
        metadata: {
          lastSaved: new Date().toISOString(),
          creativeType: creative.type,
          fileName: creative.name,
        },
      });
      onMetadataChange?.(creative.id, {
        fromLines,
        subjectLines,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save creative data:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save creative data";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    creative.id,
    creative.name,
    creative.type,
    fromLines,
    subjectLines,
    proofreadingData,
    htmlContent,
    additionalNotes,
    onMetadataChange,
    onClose,
  ]);

  const handleFileNameSave = async () => {
    if (!editableNameOnly.trim()) {
      return;
    }

    const originalExtension = creative.name.substring(
      creative.name.lastIndexOf(".")
    );
    const newFileName = editableNameOnly.trim() + originalExtension;

    if (creative.name === newFileName) {
      setIsEditing(false);
      return;
    }

    const previousName = creative.name;
    setEditableFileName(newFileName);
    setIsEditing(false);

    try {
      await renameCreative({
        creativeId: creative.id,
        fileUrl: creative.url,
        newName: newFileName,
      });

      creative.name = newFileName;
      onFileNameChange?.(creative.id, newFileName);
    } catch (error) {
      console.error("Failed to rename file:", error);
      setEditableFileName(previousName);
      const lastDotIndex = previousName.lastIndexOf(".");
      setEditableNameOnly(
        lastDotIndex > 0
          ? previousName.substring(0, lastDotIndex)
          : previousName
      );
      const errorMessage =
        error instanceof Error ? error.message : "Failed to rename file";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameOnly = e.target.value;
    setEditableNameOnly(nameOnly);
    const extension = creative.name.substring(creative.name.lastIndexOf("."));
    setEditableFileName(nameOnly + extension);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleFileNameSave();
    } else if (e.key === "Escape") {
      setEditableFileName(creative.name);
      const lastDotIndex = creative.name.lastIndexOf(".");
      setEditableNameOnly(
        lastDotIndex > 0
          ? creative.name.substring(0, lastDotIndex)
          : creative.name
      );
      setIsEditing(false);
    }
  };

  const handleGenerateContent = async () => {
    try {
      setIsGeneratingContent(true);
      let sampleText = "";
      if (creative.type === "html" || creative.html) {
        if (htmlContent) {
          sampleText = htmlContent
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 1000);
        }
      } else if (creative.type === "image") {
        sampleText = `Image creative: ${creative.name}`;
      }

      const { fromLines: newFromLines, subjectLines: newSubjectLines } =
        await generateEmailContent({
          creativeType: creative.type || "Email",
          sampleText,
          maxFrom: 4,
          maxSubject: 8,
        });

      const mergeContent = (existing: string, newItems: string[]) => {
        const existingLines = existing
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const newLines = newItems.map((s) => s.trim()).filter(Boolean);
        const allLines = [...existingLines, ...newLines];
        const uniqueLines = Array.from(new Set(allLines));
        return uniqueLines.join("\n");
      };

      const mergedFromLines = mergeContent(fromLines, newFromLines);
      const mergedSubjectLines = mergeContent(subjectLines, newSubjectLines);

      setFromLines(mergedFromLines);
      setSubjectLines(mergedSubjectLines);

      try {
        await saveCreativeMetadata({
          creativeId: creative.id,
          fromLines: mergedFromLines,
          subjectLines: mergedSubjectLines,
          proofreadingData: proofreadingData || undefined,
          htmlContent,
          additionalNotes,
          metadata: {
            lastGenerated: new Date().toISOString(),
            creativeType: creative.type,
            fileName: creative.name,
          },
        });
      } catch (saveError) {
        console.error("Failed to save generated content:", saveError);
      }
    } catch (error) {
      console.error("Content generation failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate content";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleRegenerateAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      const isHtml =
        creative.html ||
        creative.type === "html" ||
        /\.html?$/i.test(creative.name);
      const isImg = creative.type === "image" || /^image\//.test(creative.type);

      if (isHtml) {
        if (!htmlContent) {
          return;
        }
        let htmlUrl = creative.url;
        if (!htmlUrl) {
          return;
        }

        if (htmlUrl && htmlUrl.startsWith("/")) {
          htmlUrl = `${window.location.origin}${htmlUrl}`;
        }

        const result = await proofreadCreative({
          creativeId: creative.id,
          fileUrl: htmlUrl,
        });
        setProofreadingData(result);
        setShowOriginal(false); // Reset to Marked view when new analysis completes
        setShowOriginalHtmlFullscreen(false); // Reset HTML fullscreen to Marked view when new analysis completes
      } else if (isImg) {
        let imageUrl = creative.previewUrl || creative.url;
        if (!imageUrl) {
          return;
        }

        if (imageUrl && imageUrl.startsWith("/")) {
          imageUrl = `${window.location.origin}${imageUrl}`;
        }

        const result = await proofreadCreative({
          creativeId: creative.id,
          fileUrl: imageUrl,
        });
        setProofreadingData(result);
        setShowOriginal(false); // Reset to Marked view when new analysis completes
        setShowOriginalFullscreen(false); // Reset image fullscreen to Marked view when new analysis completes
      }
    } catch (error) {
      console.error("Proofreading failed:", error);
      setProofreadingData({
        success: false,
        issues: [],
        suggestions: [
          {
            icon: "ℹ️",
            type: "Notice",
            description: "Proofreading failed. Please try again.",
          },
        ],
        qualityScore: {
          grammar: 0,
          readability: 0,
          conversion: 0,
          brandAlignment: 0,
        },
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveHtml = async () => {
    try {
      setIsSaving(true);
      await saveHtml({
        creativeId: creative.id,
        html: htmlContent,
      });
      setPreviewKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to save HTML:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save HTML";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        handleSaveAll();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleSaveAll]);

  useEffect(() => {
    if (!isImagePreviewFullscreen) {
      setImageZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [isImagePreviewFullscreen]);

  const constrainPosition = useCallback(
    (
      x: number,
      y: number,
      zoom: number,
      containerWidth: number,
      containerHeight: number,
      imgWidth: number,
      imgHeight: number
    ) => {
      if (zoom <= 1) {
        return { x: 0, y: 0 };
      }

      // Calculate the displayed size (image fits in container with object-contain)
      const containerAspect = containerWidth / containerHeight;
      const imageAspect = imgWidth / imgHeight;

      let displayedWidth: number;
      let displayedHeight: number;

      if (imageAspect > containerAspect) {
        // Image is wider - fit to width
        displayedWidth = containerWidth;
        displayedHeight = containerWidth / imageAspect;
      } else {
        // Image is taller - fit to height
        displayedHeight = containerHeight;
        displayedWidth = containerHeight * imageAspect;
      }

      // Calculate scaled dimensions
      const scaledWidth = displayedWidth * zoom;
      const scaledHeight = displayedHeight * zoom;

      // Calculate bounds (how far the image can move before going off-screen)
      const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
      const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

      // Constrain the position
      const constrainedX = Math.max(-maxX, Math.min(maxX, x));
      const constrainedY = Math.max(-maxY, Math.min(maxY, y));

      return { x: constrainedX, y: constrainedY };
    },
    []
  );

  const handleZoomIn = useCallback(() => {
    setImageZoom((prev) => {
      const newZoom = Math.min(prev + 0.25, 1.5);
      if (
        newZoom > 1 &&
        imageDimensions.width > 0 &&
        imageDimensions.height > 0
      ) {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight - 80;
        const constrained = constrainPosition(
          imagePosition.x,
          imagePosition.y,
          newZoom,
          containerWidth,
          containerHeight,
          imageDimensions.width,
          imageDimensions.height
        );
        setImagePosition(constrained);
      }
      return newZoom;
    });
  }, [imagePosition, imageDimensions, constrainPosition]);

  const handleZoomOut = useCallback(() => {
    setImageZoom((prev) => {
      const newZoom = Math.max(prev - 0.25, 1);
      if (newZoom === 1) {
        setImagePosition({ x: 0, y: 0 });
      } else if (imageDimensions.width > 0 && imageDimensions.height > 0) {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight - 80;
        const constrained = constrainPosition(
          imagePosition.x,
          imagePosition.y,
          newZoom,
          containerWidth,
          containerHeight,
          imageDimensions.width,
          imageDimensions.height
        );
        setImagePosition(constrained);
      }
      return newZoom;
    });
  }, [imagePosition, imageDimensions, constrainPosition]);

  const handleResetZoom = useCallback(() => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  }, []);

  const handleImageMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (imageZoom > 1) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({
          x: e.clientX - imagePosition.x,
          y: e.clientY - imagePosition.y,
        });
      }
    },
    [imageZoom, imagePosition]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (
        isDragging &&
        imageZoom > 1 &&
        imageDimensions.width > 0 &&
        imageDimensions.height > 0
      ) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Get container dimensions (viewport)
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight - 80; // Subtract header height

        const constrained = constrainPosition(
          newX,
          newY,
          imageZoom,
          containerWidth,
          containerHeight,
          imageDimensions.width,
          imageDimensions.height
        );

        setImagePosition(constrained);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, imageZoom, dragStart, imageDimensions, constrainPosition]);

  const handleImageMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setImageDimensions({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    },
    []
  );

  return {
    editableFileName,
    editableNameOnly,
    isEditing,
    fromLines,
    subjectLines,
    isHtmlEditorFullscreen,
    isImagePreviewFullscreen,
    isHtmlPreviewFullscreen,
    isPreviewCollapsed,
    proofreadingData,
    htmlContent,
    isSaving,
    previewKey,
    additionalNotes,
    isGeneratingContent,
    isAnalyzing,
    imageZoom,
    imagePosition,
    isDragging,
    showOriginal,
    setShowOriginal,
    showOriginalFullscreen,
    setShowOriginalFullscreen,
    showOriginalHtmlFullscreen,
    setShowOriginalHtmlFullscreen,
    setIsEditing,
    setEditableFileName,
    setEditableNameOnly,
    setFromLines,
    setSubjectLines,
    setIsHtmlEditorFullscreen,
    setIsImagePreviewFullscreen,
    setIsHtmlPreviewFullscreen,
    setIsPreviewCollapsed,
    setHtmlContent,
    setAdditionalNotes,
    handleSaveAll,
    handleFileNameSave,
    handleFileNameChange,
    handleKeyDown,
    handleGenerateContent,
    handleRegenerateAnalysis,
    handleSaveHtml,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleImageMouseDown,
    handleImageMouseUp,
    handleImageLoad,
    toggleHtmlEditorFullscreen: () =>
      setIsHtmlEditorFullscreen(!isHtmlEditorFullscreen),
    toggleImagePreviewFullscreen: () =>
      setIsImagePreviewFullscreen(!isImagePreviewFullscreen),
    toggleHtmlPreviewFullscreen: () =>
      setIsHtmlPreviewFullscreen(!isHtmlPreviewFullscreen),
    togglePreviewCollapse: () => setIsPreviewCollapsed(!isPreviewCollapsed),
    getMarkedImageUrl,
    getMarkedHtmlContent,
  };
};
