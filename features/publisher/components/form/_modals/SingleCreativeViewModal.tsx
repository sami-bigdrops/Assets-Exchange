"use client";

import {
  Edit3,
  Eye,
  FileText,
  Image,
  File,
  Sparkles,
  Maximize2,
  Minimize2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
const formatFileSizeLocal = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
import {
  useSingleCreativeViewModal,
  type Creative,
} from "@/features/publisher/view-models/singleCreativeViewModal.viewModel";

interface SingleCreativeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  creative: Creative;
  onFileNameChange?: (fileId: string, newFileName: string) => void;
  onMetadataChange?: (
    fileId: string,
    metadata: { fromLines?: string; subjectLines?: string }
  ) => void;
  onFileUpdate?: (updates: {
    url?: string;
    metadata?: { fromLines?: string; subjectLines?: string };
  }) => void;
  showAdditionalNotes?: boolean;
  creativeType?: string;
}

const getFileType = (fileName: string): "image" | "html" | "other" => {
  const lowerName = fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lowerName)) {
    return "image";
  }
  if (/\.(html|htm)$/i.test(lowerName)) {
    return "html";
  }
  return "other";
};

const SingleCreativeViewModal: React.FC<SingleCreativeViewModalProps> = ({
  isOpen,
  onClose,
  creative,
  onFileNameChange,
  onMetadataChange,
  onFileUpdate,
  showAdditionalNotes = false,
  creativeType = "email",
}) => {
  const viewModel = useSingleCreativeViewModal({
    isOpen,
    creative,
    onClose,
    onFileNameChange,
    onMetadataChange,
    showAdditionalNotes,
    creativeType,
  });

  const { isProofreadComplete, proofreadResult } = viewModel;

  React.useEffect(() => {
    if (isProofreadComplete && proofreadResult && onFileUpdate) {
      onFileUpdate({
        url: proofreadResult.marked_image || creative?.url,
        metadata: {
          proofreadingData: {
            issues: proofreadResult.issues || [],
            suggestions: proofreadResult.suggestions || [],
            qualityScore: proofreadResult.qualityScore,
            success: proofreadResult.success,
          },
          ai_issues: proofreadResult.issues || [],
          ai_score:
            proofreadResult.qualityScore?.grammar ||
            (proofreadResult.issues?.length === 0 ? 100 : 80),
          ai_status:
            (proofreadResult.issues?.length || 0) === 0 ? "clean" : "flagged",
          last_checked: new Date().toISOString(),
        },
      });
    }
  }, [isProofreadComplete, proofreadResult, onFileUpdate, creative?.url]);

  if (!isOpen) return null;

  const fileType = getFileType(creative.name);
  const isImage = fileType === "image";
  const isHtml = fileType === "html";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={viewModel.handleSaveAll}>
        <DialogContent
          className="max-w-screen! max-h-screen! w-screen h-screen m-0 p-0 rounded-none"
          showCloseButton={false}
        >
          <div className="flex flex-col h-full w-full">
            {/* Header */}
            <DialogHeader className="shrink-0 border-b p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 sm:gap-4 lg:gap-6">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="shrink-0">
                    {isImage ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                    ) : isHtml ? (
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                    ) : (
                      <File className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    {viewModel.isEditing ? (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center">
                          <Input
                            value={viewModel.editableNameOnly}
                            onChange={viewModel.handleFileNameChange}
                            onKeyDown={viewModel.handleKeyDown}
                            className="text-xs sm:text-sm font-medium h-8 sm:h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white px-3 py-2 w-auto min-w-0"
                            autoFocus
                            placeholder="Filename"
                          />
                          <span className="text-xs sm:text-sm text-gray-700 font-medium px-2 py-2 h-8 sm:h-9 flex items-center whitespace-nowrap">
                            {creative.name.substring(
                              creative.name.lastIndexOf(".")
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={viewModel.handleFileNameSave}
                            className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              viewModel.setIsEditing(false);
                              viewModel.setEditableFileName(creative.name);
                              const lastDotIndex =
                                creative.name.lastIndexOf(".");
                              viewModel.setEditableNameOnly(
                                lastDotIndex > 0
                                  ? creative.name.substring(0, lastDotIndex)
                                  : creative.name
                              );
                            }}
                            className="h-9 w-9 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                          {viewModel.editableFileName}
                        </DialogTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const lastDotIndex =
                              viewModel.editableFileName.lastIndexOf(".");
                            viewModel.setEditableNameOnly(
                              lastDotIndex > 0
                                ? viewModel.editableFileName.substring(
                                    0,
                                    lastDotIndex
                                  )
                                : viewModel.editableFileName
                            );
                            viewModel.setIsEditing(true);
                          }}
                          className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded border border-purple-200">
                      {creative.type?.split("/")[1] || "File"}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200">
                      {formatFileSizeLocal(creative.size)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={viewModel.handleSaveAll}
                    disabled={viewModel.isSaving}
                    className="h-9 px-3 sm:px-4 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm disabled:opacity-50"
                  >
                    {viewModel.isSaving ? "Saving..." : "Save and Continue"}
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Content */}
            <DialogBody className="max-h-screen! flex-1 flex flex-col lg:flex-row overflow-hidden p-0">
              {/* Preview Column */}
              <div
                className={`${
                  viewModel.isPreviewCollapsed ? "hidden lg:flex" : "flex"
                } lg:w-1/2 lg:border-r border-gray-200 p-4 sm:p-6 bg-gray-50 flex-col min-h-0`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-200 mb-5 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Preview
                    </h3>
                  </div>

                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={viewModel.togglePreviewCollapse}
                      className="lg:hidden flex items-center gap-2 h-9"
                    >
                      <ChevronUp className="h-4 w-4" />
                      <span>Collapse</span>
                    </Button>

                    {/* Toggle between Original and Marked view - only show after analysis */}
                    {isImage &&
                      (creative.previewUrl || creative.url) &&
                      viewModel.proofreadingData && (
                        <div className="inline-flex items-center gap-0 border border-gray-300 rounded-lg p-0.5 bg-white shadow-sm h-9">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              viewModel.setShowOriginal(true);
                            }}
                            className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                              viewModel.showOriginal
                                ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                            }`}
                          >
                            Original
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              viewModel.setShowOriginal(false);
                            }}
                            className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                              !viewModel.showOriginal
                                ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                            }`}
                          >
                            Marked
                          </button>
                        </div>
                      )}

                    {/* Toggle between Original and Marked view for HTML - only show after analysis */}
                    {isHtml && viewModel.proofreadingData && (
                      <div className="inline-flex items-center gap-0 border border-gray-300 rounded-lg p-0.5 bg-white shadow-sm h-9">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            viewModel.setShowOriginal(true);
                          }}
                          className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                            viewModel.showOriginal
                              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                          }`}
                        >
                          Original
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            viewModel.setShowOriginal(false);
                          }}
                          className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                            !viewModel.showOriginal
                              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                          }`}
                        >
                          Marked
                        </button>
                      </div>
                    )}

                    {isImage && (creative.previewUrl || creative.url) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={viewModel.toggleImagePreviewFullscreen}
                        className="flex items-center gap-2 h-9"
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span>Fullscreen</span>
                      </Button>
                    )}
                    {isHtml && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={viewModel.toggleHtmlPreviewFullscreen}
                        className="flex items-center gap-2 h-9"
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span>Fullscreen</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-auto min-h-[300px] lg:min-h-0">
                  {isImage && (creative.previewUrl || creative.url) ? (
                    viewModel.proofreadingData && !viewModel.showOriginal ? (
                      // Marked view - show the marked image from API
                      (() => {
                        const markedImageUrl = viewModel.getMarkedImageUrl();
                        return markedImageUrl ? (
                          <div className="w-full p-4 flex justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={markedImageUrl}
                              alt={`Marked ${creative.name}`}
                              className="max-w-[600px] w-full h-auto rounded-lg shadow-sm"
                            />
                          </div>
                        ) : (
                          // Fallback placeholder if marked image URL is not available
                          <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="flex flex-col items-center gap-4 text-center max-w-md">
                              <div className="p-4 bg-amber-100 rounded-full">
                                <FileText className="h-12 w-12 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                                  Marked View
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Marked image is being processed. Please
                                  wait...
                                </p>
                                {viewModel.proofreadingData.issues &&
                                  viewModel.proofreadingData.issues.length >
                                    0 && (
                                    <div className="mt-4 flex items-center justify-center gap-2">
                                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                        <X className="h-3 w-3" />
                                        {
                                          viewModel.proofreadingData.issues
                                            .length
                                        }{" "}
                                        Issue
                                        {viewModel.proofreadingData.issues
                                          .length !== 1
                                          ? "s"
                                          : ""}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      // Original view - show the actual image
                      <div className="w-full p-4 flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={creative.previewUrl || creative.url}
                          alt={creative.name}
                          className="max-w-[600px] w-full h-auto rounded-lg shadow-sm"
                        />
                      </div>
                    )
                  ) : isHtml ? (
                    viewModel.proofreadingData && !viewModel.showOriginal ? (
                      // Marked view - show the marked HTML from API
                      (() => {
                        const markedHtmlContent =
                          viewModel.getMarkedHtmlContent();
                        return markedHtmlContent ? (
                          <iframe
                            key={`marked-${viewModel.previewKey}`}
                            srcDoc={markedHtmlContent}
                            title="Marked HTML Preview"
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        ) : (
                          // Fallback placeholder if marked HTML is not available
                          <div className="w-full h-full flex items-center justify-center p-8">
                            <div className="flex flex-col items-center gap-4 text-center max-w-md">
                              <div className="p-4 bg-amber-100 rounded-full">
                                <FileText className="h-12 w-12 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                                  Marked View
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Marked HTML is being processed. Please wait...
                                </p>
                                {viewModel.proofreadingData.issues &&
                                  viewModel.proofreadingData.issues.length >
                                    0 && (
                                    <div className="mt-4 flex items-center justify-center gap-2">
                                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                        <X className="h-3 w-3" />
                                        {
                                          viewModel.proofreadingData.issues
                                            .length
                                        }{" "}
                                        Issue
                                        {viewModel.proofreadingData.issues
                                          .length !== 1
                                          ? "s"
                                          : ""}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      // Original view - show the actual HTML
                      <iframe
                        key={viewModel.previewKey}
                        srcDoc={
                          viewModel.htmlContent ||
                          '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,sans-serif;color:#666;"><p>HTML content will appear here</p></div>'
                        }
                        title="HTML Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-center space-y-3 p-4">
                      <div>
                        <File className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-3">
                          File Preview Not Available
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => window.open(creative.url, "_blank")}
                          className="flex items-center gap-2 h-9"
                        >
                          <Eye className="h-4 w-4" />
                          Open File
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Features Column */}
              <div
                className={`${
                  viewModel.isPreviewCollapsed ? "w-full" : "lg:w-1/2"
                } p-4 sm:p-6 overflow-y-auto bg-gray-50 border-t lg:border-t-0 border-gray-200`}
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Features
                      </h3>
                    </div>

                    {viewModel.isPreviewCollapsed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={viewModel.togglePreviewCollapse}
                        className="lg:hidden flex items-center gap-2 h-9"
                      >
                        <ChevronDown className="h-4 w-4" />
                        <span>Show Preview</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* HTML Editor */}
                    {isHtml && (
                      <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 mb-4 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <FileText className="h-5 w-5 text-orange-600" />
                            </div>
                            <h3 className="text-sm sm:text-lg font-semibold text-gray-800">
                              HTML Editor
                            </h3>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={viewModel.toggleHtmlEditorFullscreen}
                              className="flex items-center gap-2 h-9"
                            >
                              <Maximize2 className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                Fullscreen
                              </span>
                              <span className="sm:hidden">Full</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={viewModel.handleSaveHtml}
                              disabled={viewModel.isSaving}
                              className="flex items-center gap-2 h-9 disabled:opacity-50 bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:text-orange-800 hover:border-orange-400 font-medium shadow-sm transition-colors"
                            >
                              {viewModel.isSaving ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4" />
                                  <span>Save Changes</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
                              HTML Code
                            </Label>
                            <Textarea
                              value={viewModel.htmlContent}
                              onChange={(e) =>
                                viewModel.setHtmlContent(e.target.value)
                              }
                              placeholder="Edit your HTML code here..."
                              rows={8}
                              className="w-full resize-none text-xs sm:text-sm font-mono border-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Make changes to your HTML creative. The preview
                              will update automatically.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Email Content */}
                    {creativeType === "email" && (
                      <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 mb-4 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="text-sm sm:text-lg font-semibold text-gray-800">
                              Email Content
                            </h3>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={viewModel.handleGenerateContent}
                            disabled={viewModel.isGeneratingContent}
                            className="flex items-center gap-2 w-full sm:w-auto h-9 disabled:opacity-50 bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:text-green-800 hover:border-green-400 font-medium shadow-sm"
                          >
                            {viewModel.isGeneratingContent ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  Generate From & Subject Lines
                                </span>
                                <span className="sm:hidden">
                                  Generate Content
                                </span>
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
                              From Lines
                            </Label>
                            <Textarea
                              value={viewModel.fromLines}
                              onChange={(e) =>
                                viewModel.setFromLines(e.target.value)
                              }
                              placeholder="Enter from lines (one per line)"
                              rows={3}
                              className="w-full resize-none text-xs sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Enter email from lines, one per line
                            </p>
                          </div>

                          <div>
                            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
                              Subject Lines
                            </Label>
                            <Textarea
                              value={viewModel.subjectLines}
                              onChange={(e) =>
                                viewModel.setSubjectLines(e.target.value)
                              }
                              placeholder="Enter subject lines (one per line)"
                              rows={3}
                              className="w-full resize-none text-xs sm:text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Enter email subject lines, one per line
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Proofreading */}
                    <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 mb-4 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <FileText className="h-5 w-5 text-amber-600" />
                          </div>
                          <h3 className="text-sm sm:text-lg font-semibold text-gray-800">
                            Proofreading & Optimization
                          </h3>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={viewModel.handleRegenerateAnalysis}
                          disabled={viewModel.isAnalyzing}
                          className="flex items-center gap-2 w-full sm:w-auto h-9 disabled:opacity-50 bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-400 font-medium shadow-sm"
                        >
                          {viewModel.isAnalyzing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                              <span>Analyzing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                Analyze Creative
                              </span>
                              <span className="sm:hidden">Analyze</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            Issues Found
                            {viewModel.proofreadingData?.issues &&
                            viewModel.proofreadingData.issues.length > 0
                              ? ` (${viewModel.proofreadingData.issues.length})`
                              : ""}
                          </h4>

                          <div className="space-y-2">
                            {viewModel.proofreadingData?.issues &&
                            viewModel.proofreadingData.issues.length > 0 ? (
                              viewModel.proofreadingData.issues.map(
                                (issue: unknown, index: number) => {
                                  const issueData = issue as {
                                    type?: string;
                                    note?: string;
                                    original?: string;
                                    correction?: string;
                                  };
                                  return (
                                    <div
                                      key={index}
                                      className="p-3 bg-red-50 border border-red-200 rounded-lg"
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className="text-xs px-2 py-1 rounded font-medium bg-red-200 text-red-800 w-max text-nowrap">
                                          {issueData.type || "Issue"}
                                        </span>
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-red-800">
                                            {issueData.note ||
                                              issueData.type ||
                                              "Issue"}
                                          </p>
                                          {issueData.original && (
                                            <p className="text-xs text-red-600 mt-1">
                                              <span className="line-through">
                                                {issueData.original}
                                              </span>
                                            </p>
                                          )}
                                          {issueData.correction && (
                                            <p className="text-xs text-green-600 mt-1">
                                              <strong>Correction:</strong>{" "}
                                              {issueData.correction}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              )
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">
                                  Click the &quot;Analyze Creative&quot; button
                                  to start proofreading.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Suggestions - Always show when proofreading data exists */}
                        {viewModel.proofreadingData && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              Suggestions
                              {viewModel.proofreadingData.suggestions &&
                              viewModel.proofreadingData.suggestions.length > 0
                                ? ` (${viewModel.proofreadingData.suggestions.length})`
                                : ""}
                            </h4>
                            <div className="space-y-2">
                              {viewModel.proofreadingData.suggestions &&
                              viewModel.proofreadingData.suggestions.length >
                                0 ? (
                                viewModel.proofreadingData.suggestions.map(
                                  (suggestion: unknown, index: number) => {
                                    const suggestionData = suggestion as {
                                      type?: string;
                                      description?: string;
                                    };
                                    return (
                                      <div
                                        key={index}
                                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className="text-xs px-2 py-1 rounded font-medium bg-blue-200 text-blue-800 w-max text-nowrap">
                                            {suggestionData.type ||
                                              "Suggestion"}
                                          </span>
                                          <p className="text-xs text-blue-800">
                                            {suggestionData.description || ""}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  }
                                )
                              ) : (
                                <div className="p-4 text-center text-gray-500">
                                  <p className="text-sm">
                                    No suggestions available at this time.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Quality Score - Always show when proofreading data exists */}
                        {viewModel.proofreadingData && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                              Quality Score
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                                <p className="text-xs text-purple-600 font-medium">
                                  Grammar
                                </p>
                                <p className="text-lg font-bold text-purple-800">
                                  {viewModel.proofreadingData.qualityScore
                                    ?.grammar ?? 0}
                                  /100
                                </p>
                              </div>
                              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                                <p className="text-xs text-purple-600 font-medium">
                                  Readability
                                </p>
                                <p className="text-lg font-bold text-purple-800">
                                  {viewModel.proofreadingData.qualityScore
                                    ?.readability ?? 0}
                                  /100
                                </p>
                              </div>
                              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                                <p className="text-xs text-purple-600 font-medium">
                                  Conversion
                                </p>
                                <p className="text-lg font-bold text-purple-800">
                                  {viewModel.proofreadingData.qualityScore
                                    ?.conversion ?? 0}
                                  /100
                                </p>
                              </div>
                              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                                <p className="text-xs text-purple-600 font-medium">
                                  Brand Alignment
                                </p>
                                <p className="text-lg font-bold text-purple-800">
                                  {viewModel.proofreadingData.qualityScore
                                    ?.brandAlignment ?? 0}
                                  /100
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 mb-4 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <FileText className="h-5 w-5 text-indigo-600" />
                          </div>
                          <h3 className="text-sm sm:text-lg font-semibold text-gray-800">
                            Additional Notes
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
                            Notes & Comments
                          </Label>
                          <Textarea
                            value={viewModel.additionalNotes}
                            onChange={(e) =>
                              viewModel.setAdditionalNotes(e.target.value)
                            }
                            placeholder="Add any additional notes, comments, or instructions for this creative..."
                            rows={4}
                            className="w-full resize-none text-xs sm:text-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Use this space to add any specific notes,
                            instructions, or comments about this creative.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogBody>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Preview Modal */}
      {isImage && (creative.previewUrl || creative.url) && (
        <Dialog
          open={viewModel.isImagePreviewFullscreen}
          onOpenChange={(open) => {
            if (!open) {
              viewModel.setIsImagePreviewFullscreen(false);
            }
          }}
        >
          <DialogContent className="max-w-screen! max-h-screen! w-screen h-screen m-0 p-0 rounded-none bg-black/50 backdrop-blur-md">
            <DialogTitle className="sr-only">
              Fullscreen Image Preview - {creative.name}
            </DialogTitle>
            <div className="flex flex-col h-full w-full relative">
              <DialogHeader className="shrink-0 border-b border-gray-700 p-4 bg-black/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={viewModel.handleZoomOut}
                      disabled={viewModel.imageZoom <= 1}
                      className="h-9 text-white hover:bg-white/20 disabled:opacity-50"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={viewModel.handleZoomIn}
                      disabled={viewModel.imageZoom >= 1.5}
                      className="h-9 text-white hover:bg-white/20 disabled:opacity-50"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={viewModel.handleResetZoom}
                      disabled={viewModel.imageZoom === 1}
                      className="h-9 text-white hover:bg-white/20 disabled:opacity-50"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                    {/* Toggle between Original and Marked view for image in fullscreen */}
                    {viewModel.proofreadingData && (
                      <div className="inline-flex items-center gap-0 border border-gray-300 rounded-lg p-0.5 bg-white shadow-sm h-9 ml-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            viewModel.setShowOriginalFullscreen(true);
                          }}
                          className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                            viewModel.showOriginalFullscreen
                              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                          }`}
                        >
                          Original
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            viewModel.setShowOriginalFullscreen(false);
                          }}
                          className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                            !viewModel.showOriginalFullscreen
                              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                          }`}
                        >
                          Marked
                        </button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewModel.setIsImagePreviewFullscreen(false)}
                    className="h-9 text-white hover:bg-white/20"
                    title="Close"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </Button>
                </div>
              </DialogHeader>
              <DialogBody className="flex-1 flex items-center justify-center overflow-hidden p-0 m-0 max-w-full! max-h-full!">
                <div
                  className="w-full h-full flex items-center justify-center overflow-hidden relative select-none"
                  style={{
                    cursor:
                      viewModel.imageZoom > 1
                        ? viewModel.isDragging
                          ? "grabbing"
                          : "grab"
                        : "default",
                    userSelect: "none",
                  }}
                  onMouseDown={viewModel.handleImageMouseDown}
                  onMouseUp={viewModel.handleImageMouseUp}
                  onMouseLeave={viewModel.handleImageMouseUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      viewModel.proofreadingData &&
                      !viewModel.showOriginalFullscreen
                        ? (() => {
                            const markedUrl = viewModel.getMarkedImageUrl();
                            return (
                              markedUrl || creative.previewUrl || creative.url
                            );
                          })()
                        : creative.previewUrl || creative.url
                    }
                    alt={
                      viewModel.proofreadingData &&
                      !viewModel.showOriginalFullscreen
                        ? `Marked ${creative.name}`
                        : creative.name
                    }
                    className="max-w-full max-h-full object-contain select-none pointer-events-none"
                    style={{
                      transform: `scale(${viewModel.imageZoom}) translate(${viewModel.imagePosition.x}px, ${viewModel.imagePosition.y}px)`,
                      transformOrigin: "center center",
                      transition: viewModel.isDragging
                        ? "none"
                        : "transform 0.2s ease-out",
                    }}
                    onLoad={viewModel.handleImageLoad}
                    draggable={false}
                  />
                </div>
              </DialogBody>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen HTML Preview Modal */}
      {isHtml && (
        <Dialog
          open={viewModel.isHtmlPreviewFullscreen}
          onOpenChange={(open) => {
            if (!open) {
              viewModel.setIsHtmlPreviewFullscreen(false);
            }
          }}
        >
          <DialogContent className="max-w-screen! max-h-screen w-screen h-screen m-0 p-0 rounded-none bg-black/50 backdrop-blur-md">
            <DialogTitle className="sr-only">
              Fullscreen HTML Preview - {creative.name}
            </DialogTitle>
            <div className="flex flex-col h-full w-full relative">
              <DialogHeader className="shrink-0 border-b border-gray-700 p-4 bg-black/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Toggle between Original and Marked view for HTML in fullscreen */}
                    {viewModel.proofreadingData && (
                      <div className="inline-flex items-center gap-0 border border-gray-300 rounded-lg p-0.5 bg-white shadow-sm h-9">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            viewModel.setShowOriginalHtmlFullscreen(true);
                          }}
                          className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                            viewModel.showOriginalHtmlFullscreen
                              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                          }`}
                        >
                          Original
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            viewModel.setShowOriginalHtmlFullscreen(false);
                          }}
                          className={`h-full px-4 text-xs font-medium transition-all rounded-md border-0 outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center ${
                            !viewModel.showOriginalHtmlFullscreen
                              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                          }`}
                        >
                          Marked
                        </button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewModel.setIsHtmlPreviewFullscreen(false)}
                    className="h-9 text-white hover:bg-white/20"
                    title="Close"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </Button>
                </div>
              </DialogHeader>
              <DialogBody className="flex-1 overflow-hidden p-0 max-w-full! max-h-full!">
                {viewModel.proofreadingData &&
                !viewModel.showOriginalHtmlFullscreen ? (
                  // Marked view - show the marked HTML from API
                  (() => {
                    const markedHtmlContent = viewModel.getMarkedHtmlContent();
                    return markedHtmlContent ? (
                      <iframe
                        key={`fullscreen-marked-${viewModel.previewKey}`}
                        srcDoc={markedHtmlContent}
                        title="Marked HTML Preview Fullscreen"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      // Fallback placeholder if marked HTML is not available
                      <div className="w-full h-full flex items-center justify-center p-8 bg-white">
                        <div className="flex flex-col items-center gap-4 text-center max-w-md">
                          <div className="p-4 bg-amber-100 rounded-full">
                            <FileText className="h-12 w-12 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">
                              Marked View
                            </h4>
                            <p className="text-sm text-gray-600">
                              Marked HTML is being processed. Please wait...
                            </p>
                            {viewModel.proofreadingData.issues &&
                              viewModel.proofreadingData.issues.length > 0 && (
                                <div className="mt-4 flex items-center justify-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                    <X className="h-3 w-3" />
                                    {
                                      viewModel.proofreadingData.issues.length
                                    }{" "}
                                    Issue
                                    {viewModel.proofreadingData.issues
                                      .length !== 1
                                      ? "s"
                                      : ""}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Original view - show the actual HTML
                  <iframe
                    key={`fullscreen-${viewModel.previewKey}`}
                    srcDoc={
                      viewModel.htmlContent ||
                      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,sans-serif;color:#666;"><p>HTML content will appear here</p></div>'
                    }
                    title="HTML Preview Fullscreen"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
              </DialogBody>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen HTML Editor Modal */}
      {isHtml && (
        <Dialog
          open={viewModel.isHtmlEditorFullscreen}
          onOpenChange={(open) => {
            if (!open) {
              viewModel.setIsHtmlEditorFullscreen(false);
            }
          }}
        >
          <DialogContent className="max-w-screen! max-h-screen w-screen h-screen m-0 p-0 rounded-none">
            <DialogTitle className="sr-only">
              Fullscreen HTML Editor - {creative.name}
            </DialogTitle>
            <div className="flex flex-col h-full w-full">
              <DialogHeader className="shrink-0 border-b border-gray-200 p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <FileText className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        HTML Editor - {creative.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Edit your HTML code and see live preview
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={viewModel.handleSaveHtml}
                      disabled={viewModel.isSaving}
                      className="flex items-center gap-2 h-9 disabled:opacity-50 bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:text-orange-800 hover:border-orange-400 font-medium shadow-sm transition-colors"
                    >
                      {viewModel.isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewModel.setIsHtmlEditorFullscreen(false)}
                      className="h-9 w-9 p-0 hover:bg-red-400 hover:text-white transition-colors"
                      title="Close"
                    >
                      <Minimize2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <DialogBody className="flex-1 overflow-hidden p-0 max-w-full! max-h-full!">
                <div className="flex h-full w-full">
                  {/* Editor Column - Left */}
                  <div className="w-1/2 border-r border-gray-200 flex flex-col bg-gray-50">
                    <div className="shrink-0 p-3 border-b border-gray-200 bg-white">
                      <Label className="text-sm font-semibold text-gray-700">
                        HTML Code Editor
                      </Label>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <Textarea
                        value={viewModel.htmlContent}
                        onChange={(e) => {
                          viewModel.setHtmlContent(e.target.value);
                        }}
                        placeholder="Edit your HTML code here..."
                        className="w-full h-full resize-none text-sm font-mono border-gray-300 focus:border-orange-500 focus:ring-orange-500/20 min-h-full"
                        style={{ minHeight: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Preview Column - Right */}
                  <div className="w-1/2 flex flex-col bg-white">
                    <div className="shrink-0 p-3 border-b border-gray-200 bg-white">
                      <Label className="text-sm font-semibold text-gray-700">
                        Live Preview
                      </Label>
                    </div>
                    <div className="flex-1 overflow-auto p-4 bg-gray-50">
                      <div className="w-full h-full border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                        <iframe
                          key={`editor-fullscreen-${viewModel.previewKey}`}
                          srcDoc={
                            viewModel.htmlContent ||
                            '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial,sans-serif;color:#666;"><p>HTML content will appear here</p></div>'
                          }
                          title="HTML Editor Live Preview"
                          className="w-full h-full border-0"
                          sandbox="allow-scripts allow-same-origin"
                          style={{ minHeight: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </DialogBody>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default SingleCreativeViewModal;
