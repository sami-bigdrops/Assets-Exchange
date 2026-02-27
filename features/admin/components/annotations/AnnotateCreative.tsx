"use client";

import { Eye, File, FileText, Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  AnnotationLayer,
  type Annotation,
  type AnnotationPositionData,
} from "./AnnotationLayer";
import { AnnotationSidebar } from "./AnnotationSidebar";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export interface AnnotateCreativeProps {
  fileName: string;
  fileTypeLabel: string;
  fileSize: number;
  creativeUrl: string;
  creativeType: "image" | "html";
  htmlContent?: string;
  annotations: Annotation[];
  pendingAnnotation: AnnotationPositionData | null;
  selectedAnnotation: Annotation | null;
  onSaveAnnotation: (content: string) => void;
  onCancelPin: () => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, content: string) => void;
  onAddAnnotation: (position: AnnotationPositionData) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
  hoveredAnnotationId?: string | null;
  onHoverAnnotation?: (id: string | null) => void;
  onLeaveAnnotation?: () => void;
  isAddingMode: boolean;
  onToggleAddingMode: () => void;
  actionLabel?: string;
  onAction?: () => void;
  isSubmitting?: boolean;
  hideHeader?: boolean;
  readOnly?: boolean;
}

export function AnnotateCreative({
  fileName,
  fileTypeLabel,
  fileSize,
  creativeUrl,
  creativeType,
  htmlContent,
  annotations,
  pendingAnnotation,
  selectedAnnotation,
  onSaveAnnotation,
  onCancelPin,
  onResolve,
  onDelete,
  onUpdate,
  onAddAnnotation,
  onSelectAnnotation,
  hoveredAnnotationId = null,
  onHoverAnnotation,
  onLeaveAnnotation,
  isAddingMode,
  onToggleAddingMode,
  actionLabel,
  onAction,
  isSubmitting,
  hideHeader = false,
  readOnly = false,
}: AnnotateCreativeProps) {
  const showActionFooter = onAction && !hideHeader;
  const lineAnnotationId =
    hoveredAnnotationId ?? selectedAnnotation?.id ?? null;
  const [connectionLineFrom, setConnectionLineFrom] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [connectionLineTo, setConnectionLineTo] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contentRect, setContentRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const updateContentRect = useCallback(() => {
    const el = contentRef.current;
    if (!el) {
      setContentRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setContentRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useEffect(() => {
    if (!lineAnnotationId) {
      setConnectionLineTo(null);
      return;
    }
    updateContentRect();
    window.addEventListener("resize", updateContentRect);
    const el = document.getElementById(`annotation-card-${lineAnnotationId}`);
    if (!el) {
      setConnectionLineTo(null);
      return () => window.removeEventListener("resize", updateContentRect);
    }
    const updateTo = () => {
      const rect = el.getBoundingClientRect();
      setConnectionLineTo({ x: rect.left, y: rect.top + rect.height / 2 });
      updateContentRect();
    };
    updateTo();
    const observer = new ResizeObserver(updateTo);
    observer.observe(el);
    window.addEventListener("scroll", updateTo, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateTo, true);
      window.removeEventListener("resize", updateContentRect);
    };
  }, [lineAnnotationId, updateContentRect]);

  const showConnectionLine =
    connectionLineFrom &&
    connectionLineTo &&
    contentRect &&
    contentRect.width > 0 &&
    contentRect.height > 0;

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {!hideHeader && (
        <header className="shrink-0 border-b border-gray-200 px-4 sm:px-6 py-4 bg-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <div className="shrink-0">
              {creativeType === "image" ? (
                <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              ) : creativeType === "html" ? (
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
              ) : (
                <File className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                {fileName}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded border border-purple-200">
                {fileTypeLabel}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200">
                {formatFileSize(fileSize)}
              </span>
            </div>
          </div>
        </header>
      )}

      <div
        ref={contentRef}
        className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative"
      >
        {showConnectionLine && contentRect && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            viewBox={`0 0 ${contentRect.width} ${contentRect.height}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <clipPath id="lineClipBelowHeaders">
                <rect
                  x={0}
                  y={56}
                  width={contentRect.width}
                  height={Math.max(0, contentRect.height - 56)}
                />
              </clipPath>
            </defs>
            <g clipPath="url(#lineClipBelowHeaders)">
              <line
                x1={connectionLineFrom.x - contentRect.left}
                y1={connectionLineFrom.y - contentRect.top}
                x2={connectionLineTo.x - contentRect.left}
                y2={connectionLineTo.y - contentRect.top}
                stroke="#ef4444"
                strokeWidth={2}
              />
            </g>
          </svg>
        )}
        <div className="flex lg:w-[70%] lg:flex-none lg:border-r border-gray-200 bg-gray-50 flex-col min-h-0 flex-1">
          <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-4 sm:px-6 shrink-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Preview</h2>
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6">
            <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg overflow-auto">
              <div className="min-h-full w-full max-w-[640px] mx-auto">
                <AnnotationLayer
                  creativeUrl={creativeUrl}
                  type={creativeType}
                  annotations={annotations}
                  isAddingMode={readOnly ? false : isAddingMode}
                  onAddAnnotation={onAddAnnotation}
                  onSelectAnnotation={onSelectAnnotation}
                  selectedAnnotationId={selectedAnnotation?.id ?? null}
                  hoveredAnnotationId={hoveredAnnotationId}
                  connectionPointAnnotationId={lineAnnotationId}
                  pendingAnnotation={pendingAnnotation}
                  onHoveredRectConnectionPoint={setConnectionLineFrom}
                  htmlContent={htmlContent}
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex lg:w-[30%] lg:flex-none flex-col overflow-hidden border-t lg:border-t-0 border-gray-200 bg-gray-50 flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <AnnotationSidebar
              annotations={annotations}
              pendingAnnotation={pendingAnnotation}
              selectedAnnotation={selectedAnnotation}
              onSave={onSaveAnnotation}
              onCancel={onCancelPin}
              onResolve={onResolve}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onSelectAnnotation={onSelectAnnotation}
              onHoverAnnotation={onHoverAnnotation}
              onLeaveAnnotation={onLeaveAnnotation}
              isAddingMode={isAddingMode}
              onToggleAddingMode={onToggleAddingMode}
              readOnly={readOnly}
            />
          </div>
          {showActionFooter && (
            <div className="shrink-0 p-4 border-t bg-white">
              <Button
                className="w-full"
                variant="destructive"
                onClick={onAction}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing..."
                  : actionLabel || "Complete Review"}
              </Button>
              <p className="text-xs text-center text-gray-500 mt-2">
                This will send the request back with these notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
