"use client";

import {
  Upload,
  File,
  X,
  Edit,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";

export interface BrandGuidelinesData {
  type: "url" | "file" | "text" | null;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  text?: string;
  notes?: string;
}

interface BrandGuidelinesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityName: string;
  entityType: "offer" | "advertiser" | "publisher";
  onSave?: (data: BrandGuidelinesData) => Promise<void>;
}

export function BrandGuidelinesModal({
  open,
  onOpenChange,
  entityId,
  entityName,
  entityType,
  onSave,
}: BrandGuidelinesModalProps) {
  const variables = getVariables();
  const inputRingColor = variables.colors.inputRingColor;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandGuidelines, setBrandGuidelines] =
    useState<BrandGuidelinesData | null>(null);

  const [editData, setEditData] = useState<BrandGuidelinesData>({
    type: null,
    url: "",
    text: "",
    notes: "",
  });

  const [editType, setEditType] = useState<"url" | "upload" | "text">("url");
  const [editFile, setEditFile] = useState<File | null>(null);

  useEffect(() => {
    if (brandGuidelines && brandGuidelines.type) {
      if (brandGuidelines.type === "file") {
        setEditType("upload");
      } else if (brandGuidelines.type === "text") {
        setEditType("text");
      } else {
        setEditType("url");
      }
    }
  }, [brandGuidelines]);

  useEffect(() => {
    if (open) {
      setIsEditMode(false);
      setIsLoading(true);
      setError(null);

      /**
       * TODO: BACKEND - Fetch Brand Guidelines
       *
       * Endpoint: GET /api/admin/{entityType}s/:id/brand-guidelines
       *
       * Path Parameters:
       * - entityType: "offers" | "advertisers" | "publishers"
       * - id: string (entity ID)
       *
       * Response:
       * {
       *   type: "url" | "file" | "text",
       *   url?: string,                       // If type is "url"
       *   fileUrl?: string,                    // If type is "file"
       *   fileName?: string,                  // If type is "file"
       *   fileSize?: number,                  // If type is "file" (bytes)
       *   mimeType?: string,                  // If type is "file"
       *   text?: string,                      // If type is "text"
       *   notes?: string,                     // Brand guidelines notes
       *   createdAt?: string,                 // ISO timestamp
       *   updatedAt?: string                  // ISO timestamp
       * }
       *
       * Error Handling:
       * - 404: Brand guidelines not found - return null (show "no guidelines" state)
       * - 401: Unauthorized - redirect to login
       * - 403: Forbidden - show permission denied
       * - 500: Server error - show error with retry option
       *
       * Implementation:
       * ```typescript
       * const response = await fetch(`/api/admin/${entityType}s/${entityId}/brand-guidelines`, {
       *   headers: {
       *     'Authorization': `Bearer ${getAuthToken()}`,
       *     'Content-Type': 'application/json'
       *   }
       * });
       *
       * if (response.status === 404) {
       *   return null; // No brand guidelines exist
       * }
       *
       * if (!response.ok) {
       *   throw new Error('Failed to fetch brand guidelines');
       * }
       *
       * return await response.json();
       * ```
       */
      // TODO: BACKEND - Replace with actual API call
      // Simulate API call
      setTimeout(() => {
        // Mock data - replace with actual API call
        const mockData: BrandGuidelinesData | null = null; // Set to null to show "no guidelines" state
        setBrandGuidelines(mockData);
        setEditData({
          type: null,
          url: "",
          text: "",
          notes: "",
        });
        setEditType("url");
        setIsLoading(false);
      }, 500);
    }
  }, [open, entityId, entityType]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isSaving && !open) {
        onOpenChange(false);
      }
    },
    [isSaving, onOpenChange]
  );

  const handleClose = useCallback(() => {
    if (!isSaving) {
      onOpenChange(false);
    }
  }, [isSaving, onOpenChange]);

  const handleEdit = () => {
    if (brandGuidelines) {
      setEditData({
        type: brandGuidelines.type,
        url: brandGuidelines.url || "",
        text: brandGuidelines.text || "",
        notes: brandGuidelines.notes || "",
      });
      if (brandGuidelines.type === "file") {
        setEditType("upload");
      } else if (brandGuidelines.type === "text") {
        setEditType("text");
      } else {
        setEditType("url");
      }
    } else {
      setEditData({
        type: null,
        url: "",
        text: "",
        notes: "",
      });
      setEditType("url");
    }
    setIsEditMode(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const dataToSave: BrandGuidelinesData = {
        type: editType === "upload" ? "file" : editType,
        url: editType === "url" ? editData.url : undefined,
        text: editType === "text" ? editData.text : undefined,
        notes: editData.notes,
      };

      /**
       * TODO: BACKEND - Save/Update Brand Guidelines
       *
       * Endpoint: PUT /api/admin/{entityType}s/:id/brand-guidelines
       *
       * Path Parameters:
       * - entityType: "offers" | "advertisers" | "publishers"
       * - id: string (entity ID)
       *
       * Request Body (JSON for URL/text, FormData for file):
       *
       * For URL type:
       * {
       *   type: "url",
       *   url: string,                        // Required, must be valid HTTPS URL
       *   notes?: string                      // Optional
       * }
       *
       * For Text type:
       * {
       *   type: "text",
       *   text: string,                       // Required, HTML or plain text
       *   notes?: string                      // Optional
       * }
       *
       * For File type (multipart/form-data):
       * - type: "file"
       * - file: File (multipart file upload)
       * - notes?: string
       *
       * File Upload Requirements:
       * - Validate file size (max 10MB)
       * - Validate file type (only .doc, .docx, .pdf)
       * - Store file in secure storage (S3, Azure Blob, etc.)
       * - If replacing existing file, delete old file from storage
       * - Return file URL or file ID for reference
       *
       * Response:
       * {
       *   type: "url" | "file" | "text",
       *   url?: string,
       *   fileUrl?: string,                   // If type is "file"
       *   fileName?: string,                  // If type is "file"
       *   fileSize?: number,                  // If type is "file"
       *   mimeType?: string,                  // If type is "file"
       *   text?: string,                      // If type is "text"
       *   notes?: string,
       *   updatedAt: string                   // ISO timestamp
       * }
       *
       * Error Handling:
       * - 400: Validation errors
       *   - Invalid URL format
       *   - Invalid file type/size
       *   - Missing required fields
       *   - Return field-specific errors
       *
       * - 401: Unauthorized - redirect to login
       * - 403: Forbidden - show permission denied
       * - 404: Entity not found
       * - 413: File too large - show specific error
       * - 500: Server error or file storage error
       *
       * Implementation Example:
       * ```typescript
       * let response;
       *
       * if (editType === 'file' && editFile) {
       *   // Use FormData for file upload
       *   const formData = new FormData();
       *   formData.append('type', 'file');
       *   formData.append('file', editFile);
       *   if (editData.notes) {
       *     formData.append('notes', editData.notes);
       *   }
       *
       *   response = await fetch(`/api/admin/${entityType}s/${entityId}/brand-guidelines`, {
       *     method: 'PUT',
       *     headers: {
       *       'Authorization': `Bearer ${getAuthToken()}`
       *     },
       *     body: formData
       *   });
       * } else {
       *   // Use JSON for URL/text
       *   const body = {
       *     type: editType === 'upload' ? 'file' : editType,
       *     ...(editType === 'url' && { url: editData.url }),
       *     ...(editType === 'text' && { text: editData.text }),
       *     ...(editData.notes && { notes: editData.notes })
       *   };
       *
       *   response = await fetch(`/api/admin/${entityType}s/${entityId}/brand-guidelines`, {
       *     method: 'PUT',
       *     headers: {
       *       'Authorization': `Bearer ${getAuthToken()}`,
       *       'Content-Type': 'application/json'
       *     },
       *     body: JSON.stringify(body)
       *   });
       * }
       *
       * if (!response.ok) {
       *   const error = await response.json();
       *   throw new Error(error.message || 'Failed to save brand guidelines');
       * }
       *
       * return await response.json();
       * ```
       *
       * Audit Trail:
       * - Log all brand guidelines updates
       * - Track which type was changed (url/file/text)
       * - Store previous values for rollback if needed
       * - Track who updated and when
       */
      // TODO: BACKEND - Replace with actual API call
      // For file uploads, use FormData with multipart/form-data

      if (onSave) {
        await onSave(dataToSave);
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Brand guidelines saved successfully", {
        description: `Brand guidelines for ${entityName} have been saved.`,
      });
      setBrandGuidelines(dataToSave);
      setIsEditMode(false);
      onOpenChange(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to save brand guidelines. Please try again.";
      setError(errorMessage);
      toast.error("Failed to save brand guidelines", {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditField = <K extends keyof BrandGuidelinesData>(
    field: K,
    value: BrandGuidelinesData[K]
  ) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const renderViewer = () => {
    if (!brandGuidelines || !brandGuidelines.type) {
      return null;
    }

    if (brandGuidelines.type === "url" && brandGuidelines.url) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <a
              href={brandGuidelines.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline font-inter flex items-center gap-1"
            >
              {brandGuidelines.url}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="w-full h-[600px] border rounded-lg overflow-hidden">
            <iframe
              src={brandGuidelines.url}
              className="w-full h-full"
              title="Brand Guidelines"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
      );
    }

    if (brandGuidelines.type === "file" && brandGuidelines.fileUrl) {
      const isPDF = brandGuidelines.mimeType === "application/pdf";
      const isDOCX =
        brandGuidelines.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <File
                size={20}
                style={{ color: variables.colors.inputTextColor }}
              />
              <div>
                <p
                  className="text-sm font-inter font-medium"
                  style={{ color: variables.colors.inputTextColor }}
                >
                  {brandGuidelines.fileName}
                </p>
                {brandGuidelines.fileSize && (
                  <p
                    className="text-xs font-inter"
                    style={{ color: variables.colors.inputPlaceholderColor }}
                  >
                    {(brandGuidelines.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
            <a
              href={brandGuidelines.fileUrl}
              download={brandGuidelines.fileName}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-inter transition-colors"
              style={{
                backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                color: variables.colors.buttonDefaultTextColor,
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
          {isPDF && (
            <div className="w-full h-[600px] border rounded-lg overflow-hidden">
              <iframe
                src={brandGuidelines.fileUrl}
                className="w-full h-full"
                title="Brand Guidelines PDF"
              />
            </div>
          )}
          {isDOCX && (
            <div
              className="p-8 text-center border rounded-lg"
              style={{ backgroundColor: variables.colors.cardBackground }}
            >
              <p
                className="text-sm font-inter"
                style={{ color: variables.colors.inputTextColor }}
              >
                DOCX files cannot be previewed in the browser. Please download
                the file to view it.
              </p>
            </div>
          )}
        </div>
      );
    }

    if (brandGuidelines.type === "text" && brandGuidelines.text) {
      return (
        <div className="border rounded-lg p-4 min-h-[200px] max-h-[600px] overflow-y-auto">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: brandGuidelines.text }}
          />
        </div>
      );
    }

    return null;
  };

  const renderEditForm = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button
              type="button"
              variant={editType === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setEditType("url")}
              disabled={isSaving}
              className="font-inter text-sm h-9!"
              style={
                editType === "url"
                  ? {
                      backgroundColor:
                        variables.colors.buttonDefaultBackgroundColor,
                      color: variables.colors.buttonDefaultTextColor,
                      height: "2.25rem",
                    }
                  : {
                      backgroundColor:
                        variables.colors.buttonOutlineBackgroundColor,
                      borderColor: variables.colors.buttonOutlineBorderColor,
                      color: variables.colors.buttonOutlineTextColor,
                      height: "2.25rem",
                    }
              }
            >
              URL
            </Button>
            <Button
              type="button"
              variant={editType === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setEditType("upload")}
              disabled={isSaving}
              className="font-inter text-sm h-9!"
              style={
                editType === "upload"
                  ? {
                      backgroundColor:
                        variables.colors.buttonDefaultBackgroundColor,
                      color: variables.colors.buttonDefaultTextColor,
                      height: "2.25rem",
                    }
                  : {
                      backgroundColor:
                        variables.colors.buttonOutlineBackgroundColor,
                      borderColor: variables.colors.buttonOutlineBorderColor,
                      color: variables.colors.buttonOutlineTextColor,
                      height: "2.25rem",
                    }
              }
            >
              Upload
            </Button>
            <Button
              type="button"
              variant={editType === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setEditType("text")}
              disabled={isSaving}
              className="font-inter text-sm h-9!"
              style={
                editType === "text"
                  ? {
                      backgroundColor:
                        variables.colors.buttonDefaultBackgroundColor,
                      color: variables.colors.buttonDefaultTextColor,
                      height: "2.25rem",
                    }
                  : {
                      backgroundColor:
                        variables.colors.buttonOutlineBackgroundColor,
                      borderColor: variables.colors.buttonOutlineBorderColor,
                      color: variables.colors.buttonOutlineTextColor,
                      height: "2.25rem",
                    }
              }
            >
              Direct Input
            </Button>
          </div>

          {editType === "url" && (
            <div className="space-y-2">
              <Input
                id="brandGuidelinesUrl"
                type="text"
                value={editData.url || ""}
                onChange={(e) => {
                  let value = e.target.value;
                  const httpsPrefix = "https://";

                  if (value.length === 0) {
                    value = httpsPrefix;
                  } else if (value.startsWith(httpsPrefix)) {
                    value = value;
                  } else if (value.startsWith("http://")) {
                    value = httpsPrefix + value.replace("http://", "");
                  } else if (
                    value.length < httpsPrefix.length &&
                    (value === "https:/" ||
                      value === "https:" ||
                      value === "https" ||
                      value === "http" ||
                      value === "http:" ||
                      value === "http:/")
                  ) {
                    value = httpsPrefix;
                  } else if (!value.startsWith("http")) {
                    value = httpsPrefix + value;
                  }
                  updateEditField("url", value);
                }}
                onFocus={(e) => {
                  const input = e.currentTarget;
                  if (!input.value.startsWith("https://")) {
                    const newValue = "https://";
                    updateEditField("url", newValue);
                    setTimeout(() => {
                      input.setSelectionRange(newValue.length, newValue.length);
                    }, 0);
                  }
                }}
                onKeyDown={(e) => {
                  const input = e.currentTarget;
                  const cursorPos = input.selectionStart || 0;
                  const selectionEnd = input.selectionEnd || 0;
                  const httpsLength = 8;

                  if (e.key === "Backspace") {
                    if (
                      cursorPos <= httpsLength &&
                      selectionEnd <= httpsLength
                    ) {
                      e.preventDefault();
                      return;
                    }
                    if (
                      cursorPos === httpsLength &&
                      selectionEnd === httpsLength
                    ) {
                      e.preventDefault();
                      return;
                    }
                  }

                  if (e.key === "Delete") {
                    if (cursorPos < httpsLength) {
                      e.preventDefault();
                      return;
                    }
                  }

                  if (e.key === "ArrowLeft" && cursorPos <= httpsLength) {
                    e.preventDefault();
                    input.setSelectionRange(httpsLength, httpsLength);
                    return;
                  }

                  if (e.key === "Home") {
                    e.preventDefault();
                    input.setSelectionRange(httpsLength, httpsLength);
                    return;
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData("text");
                  let cleanText = pastedText;
                  if (pastedText.startsWith("https://")) {
                    cleanText = pastedText.replace("https://", "");
                  } else if (pastedText.startsWith("http://")) {
                    cleanText = pastedText.replace("http://", "");
                  }
                  const input = e.currentTarget;
                  const start = Math.max(input.selectionStart || 0, 8);
                  const end = Math.max(input.selectionEnd || 0, 8);
                  const currentValue = editData.url || "https://";
                  const baseUrl = currentValue.substring(0, 8);
                  const newValue =
                    baseUrl +
                    currentValue.slice(8, start) +
                    cleanText +
                    currentValue.slice(end);
                  updateEditField("url", newValue);
                  setTimeout(() => {
                    const newCursorPos = start + cleanText.length;
                    input.setSelectionRange(newCursorPos, newCursorPos);
                  }, 0);
                }}
                placeholder="Enter brand guideline url"
                disabled={isSaving}
                className="h-12 font-inter"
                style={{
                  backgroundColor: variables.colors.inputBackgroundColor,
                  borderColor: variables.colors.inputBorderColor,
                  color: variables.colors.inputTextColor,
                }}
              />
            </div>
          )}

          {editType === "upload" && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                id="brandGuidelinesFile"
                type="file"
                accept=".doc,.docx,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setEditFile(file);
                }}
                disabled={isSaving}
                className="hidden"
              />
              {editFile && (
                <div
                  className="flex items-center justify-between w-full h-12 px-4 rounded-lg border"
                  style={{
                    borderColor: variables.colors.inputBorderColor,
                    backgroundColor: variables.colors.inputBackgroundColor,
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File
                      size={20}
                      style={{ color: variables.colors.inputTextColor }}
                      className="shrink-0"
                    />
                    <span
                      className="text-sm font-inter truncate"
                      style={{ color: variables.colors.inputTextColor }}
                      title={editFile.name}
                    >
                      {editFile.name}
                    </span>
                    <span
                      className="text-xs font-inter ml-auto shrink-0"
                      style={{ color: variables.colors.inputPlaceholderColor }}
                    >
                      {(editFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    disabled={isSaving}
                    className="ml-2 p-1 rounded hover:bg-opacity-10 transition-colors shrink-0"
                    style={{ color: variables.colors.inputTextColor }}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="Upload file"
                className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all focus-visible:outline-none"
                style={{
                  borderColor: variables.colors.inputBorderColor,
                  backgroundColor: variables.colors.inputBackgroundColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = inputRingColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    variables.colors.inputBorderColor;
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = inputRingColor;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${inputRingColor}50`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    variables.colors.inputBorderColor;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload
                    className="mb-2"
                    style={{ color: variables.colors.inputTextColor }}
                    size={24}
                  />
                  <p
                    className="mb-2 text-sm font-inter"
                    style={{ color: variables.colors.inputTextColor }}
                  >
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p
                    className="text-xs font-inter"
                    style={{ color: variables.colors.inputPlaceholderColor }}
                  >
                    DOCX, PDF (MAX. 10MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          {editType === "text" && (
            <div className="space-y-2">
              <RichTextEditor
                value={editData.text || ""}
                onChange={(value) => updateEditField("text", value)}
                placeholder="Enter brand guidelines text..."
                disabled={isSaving}
                className="font-inter"
                style={{
                  backgroundColor: variables.colors.inputBackgroundColor,
                  borderColor: variables.colors.inputBorderColor,
                  color: variables.colors.inputTextColor,
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="brandGuidelinesNotes" className="font-inter text-sm">
            Brand Guidelines Notes
          </Label>
          <Textarea
            id="brandGuidelinesNotes"
            value={editData.notes || ""}
            onChange={(e) => updateEditField("notes", e.target.value)}
            placeholder="Enter any additional notes about the brand guidelines..."
            disabled={isSaving}
            rows={4}
            className="font-inter resize-none"
            style={{
              backgroundColor: variables.colors.inputBackgroundColor,
              borderColor: variables.colors.inputBorderColor,
              color: variables.colors.inputTextColor,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader
          className="-mt-1 -mx-1 mb-0 px-8 py-6 overflow-hidden"
          style={{
            backgroundColor: variables.colors.cardHeaderBackgroundColor,
          }}
        >
          <DialogTitle
            className="xl:text-lg text-sm lg:text-base font-inter font-semibold"
            style={{ color: variables.colors.cardHeaderTextColor }}
          >
            Brand Guidelines - {entityName}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="min-w-0 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p
                className="text-sm font-inter"
                style={{ color: variables.colors.inputTextColor }}
              >
                Loading brand guidelines...
              </p>
            </div>
          ) : isEditMode ? (
            renderEditForm()
          ) : brandGuidelines && brandGuidelines.type ? (
            <div className="space-y-4">
              {renderViewer()}
              {brandGuidelines.notes && (
                <div className="space-y-2">
                  <Label className="font-inter text-sm font-semibold">
                    Notes
                  </Label>
                  <div
                    className="p-3 border rounded-lg"
                    style={{ backgroundColor: variables.colors.cardBackground }}
                  >
                    <p
                      className="text-sm font-inter whitespace-pre-wrap"
                      style={{ color: variables.colors.inputTextColor }}
                    >
                      {brandGuidelines.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p
                className="text-sm font-inter"
                style={{ color: variables.colors.inputTextColor }}
              >
                No brand guidelines found. Please add brand guidelines using one
                of the options below.
              </p>
              {renderEditForm()}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 mt-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <DialogClose asChild className="w-full sm:w-auto min-w-0 shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={handleClose}
              className="w-full flex-1 h-12! font-inter font-medium"
              style={{
                backgroundColor: variables.colors.buttonOutlineBackgroundColor,
                borderColor: variables.colors.buttonOutlineBorderColor,
                color: variables.colors.buttonOutlineTextColor,
                height: "3rem",
              }}
            >
              {isEditMode ? "Cancel" : "Close"}
            </Button>
          </DialogClose>
          {!isEditMode && brandGuidelines && brandGuidelines.type && (
            <Button
              type="button"
              onClick={handleEdit}
              disabled={isSaving}
              className="w-full flex-1 h-12! font-inter font-medium shrink-0"
              style={{
                backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                color: variables.colors.buttonDefaultTextColor,
                height: "3rem",
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Brand Guidelines
            </Button>
          )}
          {isEditMode && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex-1 h-12! font-inter font-medium shrink-0"
              style={{
                backgroundColor: isSaving
                  ? variables.colors.buttonDisabledBackgroundColor
                  : variables.colors.buttonDefaultBackgroundColor,
                color: isSaving
                  ? variables.colors.buttonDisabledTextColor
                  : variables.colors.buttonDefaultTextColor,
                height: "3rem",
              }}
              aria-label="Save brand guidelines"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Brand Guidelines"
              )}
            </Button>
          )}
          {!isEditMode && (!brandGuidelines || !brandGuidelines.type) && (
            <Button
              type="button"
              onClick={() => setIsEditMode(true)}
              disabled={isSaving}
              className="w-full flex-1 h-12! font-inter font-medium shrink-0"
              style={{
                backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                color: variables.colors.buttonDefaultTextColor,
                height: "3rem",
              }}
            >
              Add Brand Guidelines
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
