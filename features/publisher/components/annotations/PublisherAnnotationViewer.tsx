"use client";

import { format } from "date-fns";
import { X, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  sanitizeRichTextOrHtml,
  sanitizeCreativeHtml,
} from "@/lib/security/sanitize";

type PositionData = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

interface Annotation {
  id: string;
  creativeId: string;
  positionData: PositionData;
  content: string;
  status: "active" | "resolved";
  adminId: string;
  createdAt: string;
}

function isRect(
  p: PositionData
): p is { x: number; y: number; width: number; height: number } {
  const w = p.width ?? 0;
  const h = p.height ?? 0;
  return w > 0.5 && h > 0.5;
}

interface PublisherAnnotationViewerProps {
  isOpen: boolean;
  onClose: () => void;
  creativeUrl: string;
  creativeName: string;
  creativeId: string;
  trackingCode: string;
  creativeType: "image" | "html";
}

export function PublisherAnnotationViewer({
  isOpen,
  onClose,
  creativeUrl,
  creativeName,
  creativeId,
  trackingCode,
  creativeType,
}: PublisherAnnotationViewerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("");

  const fetchAnnotations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/track/annotations?creativeId=${creativeId}&trackingCode=${trackingCode}`
      );
      if (res.ok) {
        const result = await res.json();
        setAnnotations(result.data || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [creativeId, trackingCode]);

  const fetchHtmlContent = useCallback(async () => {
    if (creativeType !== "html") return;
    try {
      const res = await fetch(creativeUrl);
      const text = await res.text();
      setHtmlContent(sanitizeCreativeHtml(text));
    } catch {
      setHtmlContent(
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:Arial;color:#666;"><p>Failed to load HTML</p></div>'
      );
    }
  }, [creativeUrl, creativeType]);

  useEffect(() => {
    if (isOpen) {
      fetchAnnotations();
      fetchHtmlContent();
    }
    return () => {
      setAnnotations([]);
      setSelectedAnnotation(null);
      setHtmlContent("");
    };
  }, [isOpen, fetchAnnotations, fetchHtmlContent]);

  useEffect(() => {
    if (selectedAnnotation) {
      const el = document.getElementById(
        `pub-ann-card-${selectedAnnotation.id}`
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedAnnotation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
      <div className="flex w-full h-full">
        <div className="flex-1 flex flex-col bg-gray-900">
          <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-gray-700">
            <h3 className="text-white font-medium text-sm truncate pr-4">
              {creativeName}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <div className="relative inline-block max-w-full max-h-full">
              {creativeType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creativeUrl}
                  alt={creativeName}
                  className="max-w-full max-h-[80vh] object-contain block"
                />
              ) : (
                <iframe
                  srcDoc={
                    sanitizeCreativeHtml(htmlContent) ||
                    '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:Arial;color:#666;"><p>Loading...</p></div>'
                  }
                  className="w-[800px] h-[600px] border-none bg-white"
                  title="HTML Creative"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}

              {/* SVG annotation shapes */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 5, overflow: "visible" }}
              >
                {annotations.map((note) => {
                  const isSelected = selectedAnnotation?.id === note.id;
                  const isResolved = note.status === "resolved";
                  const fillColor = isResolved
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(239,68,68,0.2)";
                  const strokeColor = isResolved
                    ? isSelected
                      ? "rgba(34,197,94,1)"
                      : "rgba(34,197,94,0.6)"
                    : isSelected
                      ? "rgba(239,68,68,1)"
                      : "rgba(239,68,68,0.6)";
                  if (isRect(note.positionData)) {
                    const pd = note.positionData;
                    return (
                      <rect
                        key={note.id}
                        x={`${pd.x}%`}
                        y={`${pd.y}%`}
                        width={`${pd.width}%`}
                        height={`${pd.height}%`}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        strokeDasharray={isSelected ? "none" : "6 3"}
                      />
                    );
                  }
                  return null;
                })}
              </svg>

              {/* Annotation markers (rect buttons or pins) */}
              {annotations.map((note, index) => {
                const isSelected = selectedAnnotation?.id === note.id;
                const isResolved = note.status === "resolved";
                const pd = note.positionData;
                if (isRect(pd)) {
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => setSelectedAnnotation(note)}
                      className="absolute flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                      style={{
                        left: `${pd.x}%`,
                        top: `${pd.y}%`,
                        width: `${Math.max(pd.width ?? 0, 4)}%`,
                        height: `${Math.max(pd.height ?? 0, 4)}%`,
                        minWidth: "24px",
                        minHeight: "24px",
                        backgroundColor: isResolved ? "#22c55e" : "#ef4444",
                        border: `2px solid ${isResolved ? "#15803d" : "#b91c1c"}`,
                        color: "white",
                        fontSize: "13px",
                        fontWeight: "bold",
                        zIndex: 10,
                        opacity: isSelected ? 1 : 0.85,
                        boxShadow: isSelected
                          ? `0 0 0 3px ${isResolved ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`
                          : "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      {index + 1}
                    </button>
                  );
                }
                return (
                  <div key={note.id}>
                    <div
                      className="absolute rounded-full pointer-events-none transition-all duration-200"
                      style={{
                        left: `${pd.x}%`,
                        top: `${pd.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: isSelected ? "60px" : "48px",
                        height: isSelected ? "60px" : "48px",
                        backgroundColor: isResolved
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.15)",
                        border: `1.5px solid ${isResolved ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        zIndex: 8,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedAnnotation(note)}
                      className="absolute rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
                      style={{
                        width: "32px",
                        height: "32px",
                        left: `${pd.x}%`,
                        top: `${pd.y}%`,
                        transform: `translate(-50%, -50%) ${isSelected ? "scale(1.15)" : ""}`,
                        backgroundColor: isResolved ? "#22c55e" : "#ef4444",
                        border: `2px solid ${isResolved ? "#15803d" : "#b91c1c"}`,
                        color: "white",
                        fontSize: "13px",
                        fontWeight: "bold",
                        zIndex: 10,
                        boxShadow: isSelected
                          ? `0 0 0 3px ${isResolved ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`
                          : "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      {index + 1}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right pane: Comments sidebar */}
        <div className="w-80 flex flex-col bg-white border-l border-gray-200">
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Admin Feedback
            </h2>
            <Badge variant="secondary">
              {annotations.filter((a) => a.status === "active").length} active
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : annotations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-4">
              <p className="text-sm text-gray-400 text-center">
                No annotations on this creative.
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {annotations.map((note, index) => {
                  const isSelected = selectedAnnotation?.id === note.id;
                  const isResolved = note.status === "resolved";
                  const accentColor = isResolved ? "#22c55e" : "#ef4444";

                  return (
                    <div
                      key={note.id}
                      id={`pub-ann-card-${note.id}`}
                      className="rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm"
                      style={{
                        borderLeft: `4px solid ${accentColor}`,
                        backgroundColor: isSelected
                          ? isResolved
                            ? "rgba(34,197,94,0.08)"
                            : "rgba(239,68,68,0.08)"
                          : "white",
                        boxShadow: isSelected
                          ? `0 0 0 2px ${accentColor}40`
                          : undefined,
                        opacity: isResolved && !isSelected ? 0.6 : 1,
                      }}
                      onClick={() => setSelectedAnnotation(note)}
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {index + 1}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(note.createdAt), "MMM d, h:mm a")}
                          </span>
                          {isResolved && (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-200 bg-green-50 ml-auto text-xs py-0"
                            >
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <div
                          className="text-sm text-gray-700 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeRichTextOrHtml(note.content),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
