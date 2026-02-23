"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { AnnotationLayer, type Annotation } from "./AnnotationLayer";
import { AnnotationSidebar } from "./AnnotationSidebar";

interface CreativeReviewProps {
  creativeId: string;
  creativeUrl: string;
  creativeType: "image" | "html";
  actionLabel?: string;
  onAction?: () => void;
  isSubmitting?: boolean;
  isReadOnly?: boolean;
}

export function CreativeReview({
  creativeId,
  creativeUrl,
  creativeType,
  actionLabel,
  onAction,
  isSubmitting,
  isReadOnly = false,
}: CreativeReviewProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{
    x: number;
    y: number;
    width?: number;
    height?: number;
  } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);

  const fetchHtmlContent = useCallback(async () => {
    if (creativeType !== "html" || !creativeUrl) return;

    try {
      const response = await fetch(creativeUrl, {
        method: "GET",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        mode: "cors",
      });

      if (response.ok) {
        const text = await response.text();
        setHtmlContent(text);
      }
    } catch (error) {
      console.error("Error fetching HTML content:", error);
    }
  }, [creativeUrl, creativeType]);

  useEffect(() => {
    if (creativeType === "html" && creativeUrl) {
      fetchHtmlContent();
    }
  }, [creativeType, creativeUrl, fetchHtmlContent]);

  const fetchAnnotations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/admin/annotations?creativeId=${creativeId}`
      );
      const data = await res.json();
      if (data.success) {
        setAnnotations(
          data.data.sort(
            (a: Annotation, b: Annotation) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        );
      }
    } catch (error) {
      console.error("Failed to load annotations", error);
      toast.error("Could not load annotations");
    } finally {
      setIsLoading(false);
    }
  }, [creativeId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const handlePinDrop = (position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  }) => {
    setPendingPin(position);
    setSelectedAnnotation(null);
  };
  const handleSaveAnnotation = async (content: string) => {
    if (!pendingPin) return;

    const tempId = Math.random().toString();
    const newNote: Annotation = {
      id: tempId,
      creativeId,
      adminId: "me",
      positionData: pendingPin,
      content,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    setAnnotations((prev) =>
      [...prev, newNote].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );
    setPendingPin(null);
    setIsAddingMode(false);

    try {
      const res = await fetch("/api/admin/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeId,
          positionData: pendingPin,
          content,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const savedData = await res.json();

      setAnnotations((prev) => {
        const updated = prev.map((a) => (a.id === tempId ? savedData.data : a));
        return updated.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      toast.success("Annotation saved");
    } catch {
      toast.error("Failed to save annotation");
      setAnnotations((prev) => prev.filter((a) => a.id !== tempId));
    }
  };

  const handleResolve = async (id: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "resolved" } : a))
    );

    try {
      await fetch(`/api/admin/annotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      toast.success("Marked as resolved");
    } catch {
      toast.error("Failed to update");
      fetchAnnotations();
    }
  };

  const handleDelete = async (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));

    try {
      await fetch(`/api/admin/annotations/${id}`, { method: "DELETE" });
      toast.success("Annotation deleted");
    } catch {
      toast.error("Failed to delete");
      fetchAnnotations();
    }
  };

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      <div className="flex-1 relative overflow-auto flex items-center justify-center p-8 bg-gray-50 border-r border-gray-200">
        {!isReadOnly && (
          <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded shadow flex gap-2">
            <button
              onClick={() => {
                setIsAddingMode(!isAddingMode);
                setPendingPin(null);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                isAddingMode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {isAddingMode ? "Cancel Pin" : "+ Add Comment"}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-gray-500">Loading annotations...</p>
          </div>
        ) : (
          <AnnotationLayer
            creativeUrl={creativeUrl}
            type={creativeType}
            annotations={annotations}
            isAddingMode={isAddingMode}
            onAddAnnotation={handlePinDrop}
            onSelectAnnotation={(note) => {
              setSelectedAnnotation(note);
              setPendingPin(null);
            }}
            htmlContent={creativeType === "html" ? htmlContent : undefined}
            selectedAnnotationId={selectedAnnotation?.id}
            pendingPin={pendingPin}
            isReadOnly={isReadOnly}
          />
        )}
      </div>

      <div className="w-[400px] bg-white flex flex-col h-full border-l border-gray-200 shadow-xl z-10">
        <div className="flex-1 overflow-hidden">
          <AnnotationSidebar
            annotations={annotations}
            pendingAnnotation={pendingPin}
            selectedAnnotation={selectedAnnotation}
            onSave={handleSaveAnnotation}
            onCancel={() => setPendingPin(null)}
            onResolve={handleResolve}
            onDelete={handleDelete}
            isReadOnly={isReadOnly}
          />
        </div>

        {onAction && (
          <div className="p-4 border-t bg-gray-50">
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
  );
}
