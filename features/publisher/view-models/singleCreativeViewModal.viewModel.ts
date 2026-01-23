import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import {
  saveHtml,
  renameCreative,
  saveCreativeMetadata,
  getCreativeMetadata,
  updateCreativeContent,
} from "@/lib/creativeClient";
import { generateEmailContent } from "@/lib/generationClient";
import {
  proofreadCreative,
  checkProofreadStatus,
} from "@/lib/proofreadCreativeClient";
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
  const [showOriginal, setShowOriginal] = useState(false);
  const [showOriginalFullscreen, setShowOriginalFullscreen] = useState(false);
  const [showOriginalHtmlFullscreen, setShowOriginalHtmlFullscreen] =
    useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Helper function to extract marked image URL from proofreading result
  const getMarkedImageUrl = useCallback((): string | null => {
    if (
      !proofreadingData?.result ||
      typeof proofreadingData.result !== "object"
    ) {
      console.warn("getMarkedImageUrl: No result or not an object", {
        hasProofreadingData: !!proofreadingData,
        hasResult: !!proofreadingData?.result,
        resultType: typeof proofreadingData?.result,
      });
      return null;
    }
    const result = proofreadingData.result as Record<string, unknown>;

    const keys = Object.keys(result);
    console.warn("getMarkedImageUrl: Keys in result:", keys);

    // Log each key and its value type/preview
    for (const key of keys) {
      const val = result[key];
      if (typeof val === "string") {
        console.warn(
          `  - ${key}: string (${val.length} chars) -> "${val.substring(0, 80)}..."`
        );
      } else {
        console.warn(`  - ${key}: ${typeof val}`);
      }
    }

    // Check direct properties
    if (result.marked_image && typeof result.marked_image === "string") {
      console.warn("getMarkedImageUrl: Found marked_image");
      return result.marked_image;
    }
    if (
      result.corrected_file_url &&
      typeof result.corrected_file_url === "string"
    ) {
      return result.corrected_file_url;
    }
    if (
      result.annotated_image_url &&
      typeof result.annotated_image_url === "string"
    ) {
      console.warn("getMarkedImageUrl: Found annotated_image_url");
      return result.annotated_image_url;
    }
    if (
      result.marked_image_url &&
      typeof result.marked_image_url === "string"
    ) {
      console.warn("getMarkedImageUrl: Found marked_image_url");
      return result.marked_image_url;
    }
    // Check for annotated_image (base64 direct)
    if (result.annotated_image && typeof result.annotated_image === "string") {
      console.warn("getMarkedImageUrl: Found annotated_image");
      return result.annotated_image;
    }
    // Check for output_image
    if (result.output_image && typeof result.output_image === "string") {
      console.warn("getMarkedImageUrl: Found output_image");
      return result.output_image;
    }
    // Check for processed_image
    if (result.processed_image && typeof result.processed_image === "string") {
      console.warn("getMarkedImageUrl: Found processed_image");
      return result.processed_image;
    }
    // Check for image (simple key)
    if (result.image && typeof result.image === "string") {
      console.warn("getMarkedImageUrl: Found image");
      return result.image;
    }
    // Check for output (simple key)
    if (result.output && typeof result.output === "string") {
      console.warn("getMarkedImageUrl: Found output");
      return result.output;
    }
    // Check for image_marked_urls array (from HTML with multiple images)
    if (
      Array.isArray(result.image_marked_urls) &&
      result.image_marked_urls.length > 0
    ) {
      const firstMarkedUrl = result.image_marked_urls[0];
      if (typeof firstMarkedUrl === "string") {
        console.warn(
          "getMarkedImageUrl: Found image_marked_urls array, using first"
        );
        return firstMarkedUrl;
      }
    }

    // Fallback: find any string that looks like an image URL or base64
    for (const key of keys) {
      const value = result[key];
      if (typeof value === "string") {
        if (
          value.startsWith("data:image/") ||
          (value.startsWith("https://") &&
            (value.includes(".png") ||
              value.includes(".jpg") ||
              value.includes(".jpeg") ||
              value.includes("blob")))
        ) {
          console.warn(`getMarkedImageUrl: Found image in key '${key}'`);
          return value;
        }
      }
    }

    // Check nested result structure (result.result.marked_image)
    if (result.result && typeof result.result === "object") {
      const nestedResult = result.result as Record<string, unknown>;
      if (
        nestedResult.marked_image &&
        typeof nestedResult.marked_image === "string"
      ) {
        return nestedResult.marked_image;
      }
      if (
        nestedResult.corrected_file_url &&
        typeof nestedResult.corrected_file_url === "string"
      ) {
        return nestedResult.corrected_file_url;
      }
      if (
        nestedResult.annotated_image_url &&
        typeof nestedResult.annotated_image_url === "string"
      ) {
        return nestedResult.annotated_image_url;
      }
      if (
        nestedResult.marked_image_url &&
        typeof nestedResult.marked_image_url === "string"
      ) {
        return nestedResult.marked_image_url;
      }
      if (
        nestedResult.annotated_image &&
        typeof nestedResult.annotated_image === "string"
      ) {
        return nestedResult.annotated_image;
      }
      if (
        nestedResult.output_image &&
        typeof nestedResult.output_image === "string"
      ) {
        return nestedResult.output_image;
      }
    }

    console.warn(
      "getMarkedImageUrl: No marked image found in result. Available keys:",
      keys.join(", ")
    );
    return null;
  }, [proofreadingData]);

  // Helper function to extract marked HTML content from proofreading result
  const getMarkedHtmlContent = useCallback((): string | null => {
    if (
      !proofreadingData?.result ||
      typeof proofreadingData.result !== "object"
    ) {
      return null;
    }
    const result = proofreadingData.result as Record<string, unknown>;

    // Check direct properties - including output_content from grammar AI
    if (result.output_content && typeof result.output_content === "string") {
      return result.output_content;
    }
    if (result.corrected_html && typeof result.corrected_html === "string") {
      return result.corrected_html;
    }
    if (result.annotated_html && typeof result.annotated_html === "string") {
      return result.annotated_html;
    }
    if (result.marked_html && typeof result.marked_html === "string") {
      return result.marked_html;
    }

    // Check nested result structure
    if (result.result && typeof result.result === "object") {
      const nestedResult = result.result as Record<string, unknown>;
      if (
        nestedResult.output_content &&
        typeof nestedResult.output_content === "string"
      ) {
        return nestedResult.output_content;
      }
      if (
        nestedResult.corrected_html &&
        typeof nestedResult.corrected_html === "string"
      ) {
        return nestedResult.corrected_html;
      }
      if (
        nestedResult.annotated_html &&
        typeof nestedResult.annotated_html === "string"
      ) {
        return nestedResult.annotated_html;
      }
      if (
        nestedResult.marked_html &&
        typeof nestedResult.marked_html === "string"
      ) {
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
      if (pollRef.current) clearInterval(pollRef.current);

      const isHtml =
        creative.html ||
        creative.type === "html" ||
        /\.html?$/i.test(creative.name);
      const isImg = creative.type === "image" || /^image\//.test(creative.type);

      let fileUrl: string | null = null;

      if (isHtml) {
        if (!htmlContent) {
          setIsAnalyzing(false);
          return;
        }
        fileUrl = creative.url;
        if (!fileUrl) {
          setIsAnalyzing(false);
          return;
        }
        if (fileUrl.startsWith("/")) {
          fileUrl = `${window.location.origin}${fileUrl}`;
        }
      } else if (isImg) {
        fileUrl = creative.previewUrl || creative.url;
        if (!fileUrl) {
          setIsAnalyzing(false);
          return;
        }
        if (fileUrl.startsWith("/")) {
          fileUrl = `${window.location.origin}${fileUrl}`;
        }
      }

      if (!fileUrl) {
        setIsAnalyzing(false);
        return;
      }

      toast.info("Analysis started...", {
        description: "This may take a few moments.",
      });

      const result = await proofreadCreative({
        creativeId: creative.id,
        fileUrl,
      });

      const isSyncComplete = result.status === "completed" || result.result;

      if (isSyncComplete) {
        const resultData = (result.result || result) as Record<string, unknown>;
        const rawCorrections = (resultData.corrections ||
          resultData.issues ||
          []) as Array<{
          original_word?: string;
          corrected_word?: string;
          original_context?: string;
          corrected_context?: string;
          type?: string;
          original?: string;
          correction?: string;
          note?: string;
        }>;

        const issues: ProofreadCreativeResponse["issues"] = rawCorrections.map(
          (c) => ({
            type: c.type || "Spelling",
            original: c.original || c.original_word || "",
            correction: c.correction || c.corrected_word || "",
            note:
              c.note ||
              (c.original_context
                ? `"${c.original_context}" → "${c.corrected_context}"`
                : undefined),
          })
        );

        const finalResult: ProofreadCreativeResponse = {
          success: true,
          result: resultData,
          issues,
          suggestions:
            (resultData.suggestions as ProofreadCreativeResponse["suggestions"]) ||
            [],
          qualityScore:
            resultData.qualityScore as ProofreadCreativeResponse["qualityScore"],
        };

        setProofreadingData(finalResult);
        setShowOriginal(false);
        setShowOriginalFullscreen(false);
        setShowOriginalHtmlFullscreen(false);
        setIsAnalyzing(false);

        const issueCount = issues?.length || 0;
        if (issueCount === 0) {
          toast.success("No issues found!", {
            description: "Your creative looks great.",
          });
        } else {
          toast.warning(
            `${issueCount} issue${issueCount !== 1 ? "s" : ""} found`,
            { description: "Switching to marked view..." }
          );
        }
      } else if (result.taskId) {
        pollRef.current = setInterval(async () => {
          try {
            const statusData = await checkProofreadStatus({
              taskId: result.taskId!,
            });

            if (
              statusData.status === "SUCCESS" ||
              statusData.status === "completed"
            ) {
              if (pollRef.current) clearInterval(pollRef.current);

              const resultData = (statusData.result || statusData) as Record<
                string,
                unknown
              >;
              const rawCorrections = (resultData.corrections ||
                resultData.issues ||
                []) as Array<{
                original_word?: string;
                corrected_word?: string;
                original_context?: string;
                corrected_context?: string;
                type?: string;
                original?: string;
                correction?: string;
                note?: string;
              }>;

              const issues: ProofreadCreativeResponse["issues"] =
                rawCorrections.map((c) => ({
                  type: c.type || "Spelling",
                  original: c.original || c.original_word || "",
                  correction: c.correction || c.corrected_word || "",
                  note:
                    c.note ||
                    (c.original_context
                      ? `"${c.original_context}" → "${c.corrected_context}"`
                      : undefined),
                }));

              const finalResult: ProofreadCreativeResponse = {
                success: true,
                result: resultData,
                issues,
                suggestions:
                  (resultData.suggestions as ProofreadCreativeResponse["suggestions"]) ||
                  [],
                qualityScore:
                  resultData.qualityScore as ProofreadCreativeResponse["qualityScore"],
              };

              setProofreadingData(finalResult);
              setShowOriginal(false);
              setShowOriginalFullscreen(false);
              setShowOriginalHtmlFullscreen(false);
              setIsAnalyzing(false);

              const issueCount = issues?.length || 0;
              if (issueCount === 0) {
                toast.success("No issues found!", {
                  description: "Your creative looks great.",
                });
              } else {
                toast.warning(
                  `${issueCount} issue${issueCount !== 1 ? "s" : ""} found`,
                  { description: "Switching to marked view..." }
                );
              }
            } else if (
              statusData.status === "FAILURE" ||
              statusData.status === "failed"
            ) {
              if (pollRef.current) clearInterval(pollRef.current);
              setIsAnalyzing(false);
              toast.error("Analysis failed", {
                description: "Please try again.",
              });
            }
          } catch (err) {
            console.error("Polling error:", err);
            if (pollRef.current) clearInterval(pollRef.current);
            setIsAnalyzing(false);
            toast.error("Failed to retrieve results");
          }
        }, 2000);
      } else {
        setIsAnalyzing(false);
        toast.error("No task ID received");
      }
    } catch (error) {
      console.error("Proofreading failed:", error);
      if (pollRef.current) clearInterval(pollRef.current);
      setIsAnalyzing(false);

      const errorMessage =
        error instanceof Error ? error.message : "Please try again.";
      const isServiceUnavailable =
        errorMessage.includes("temporarily unavailable") ||
        errorMessage.includes("502") ||
        errorMessage.includes("503") ||
        errorMessage.includes("504") ||
        errorMessage.includes("starting up");

      toast.error(
        isServiceUnavailable ? "AI Service Unavailable" : "Proofreading failed",
        {
          description: isServiceUnavailable
            ? "The AI service is starting up. Please wait a moment and try again."
            : errorMessage,
          duration: isServiceUnavailable ? 8000 : 5000,
        }
      );

      setProofreadingData({
        success: false,
        issues: [],
        suggestions: [
          {
            icon: isServiceUnavailable ? "info" : "alert",
            type: isServiceUnavailable ? "Notice" : "Error",
            description: isServiceUnavailable
              ? "The AI service is temporarily unavailable. It may be starting up. Please wait a moment and try again."
              : "Proofreading failed. Please try again.",
          },
        ],
        qualityScore: {
          grammar: 0,
          readability: 0,
          conversion: 0,
          brandAlignment: 0,
        },
      });
    }
  };

  const handleSaveHtml = async () => {
    try {
      setIsSaving(true);

      const updateResult = await updateCreativeContent({
        creativeId: creative.id,
        content: htmlContent,
        filename: creative.name,
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update file");
      }

      if (updateResult.newUrl) {
        creative.url = updateResult.newUrl;
      }

      await saveHtml({
        creativeId: creative.id,
        html: htmlContent,
      });

      setPreviewKey((prev) => prev + 1);
      toast.success("HTML saved successfully!", {
        description: "File updated in storage.",
      });
    } catch (error) {
      console.error("Failed to save HTML:", error);
      toast.error("Failed to save HTML", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
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
