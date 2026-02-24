"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { AnnotateCreative } from "./AnnotateCreative";
import type { Annotation, AnnotationPositionData } from "./AnnotationLayer";

interface CreativeReviewProps {
  creativeId: string;
  creativeUrl: string;
  creativeType: "image" | "html";
  fileName?: string;
  fileTypeLabel?: string;
  fileSize?: number;
  actionLabel?: string;
  onAction?: () => void;
  isSubmitting?: boolean;
  hideHeader?: boolean;
  readOnly?: boolean;
}

export function CreativeReview({
  creativeId,
  creativeUrl,
  creativeType,
  fileName,
  fileTypeLabel,
  fileSize = 0,
  actionLabel,
  onAction,
  isSubmitting,
  hideHeader = false,
  readOnly = false,
}: CreativeReviewProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] =
    useState<AnnotationPositionData | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(
    null
  );

  const sortByCreatedAtAsc = useCallback(
    (list: Annotation[]) =>
      [...list].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    []
  );

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
        setAnnotations(sortByCreatedAtAsc(data.data));
      }
    } catch (error) {
      console.error("Failed to load annotations", error);
      toast.error("Could not load annotations");
    } finally {
      setIsLoading(false);
    }
  }, [creativeId, sortByCreatedAtAsc]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const handleAddAnnotation = (position: AnnotationPositionData) => {
    setPendingAnnotation(position);
    setSelectedAnnotation(null);
  };

  const handleToggleAddingMode = () => {
    setIsAddingMode((prev) => !prev);
    setPendingAnnotation(null);
  };

  const handleSaveAnnotation = async (content: string) => {
    if (!pendingAnnotation) return;

    const tempId = Math.random().toString();
    const newNote: Annotation = {
      id: tempId,
      creativeId,
      adminId: "me",
      positionData: pendingAnnotation,
      content,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    setAnnotations((prev) => sortByCreatedAtAsc([...prev, newNote]));
    setPendingAnnotation(null);
    setIsAddingMode(false);

    try {
      const res = await fetch("/api/admin/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeId,
          positionData: pendingAnnotation,
          content,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const savedData = await res.json();

      setAnnotations((prev) =>
        sortByCreatedAtAsc(
          prev.map((a) => (a.id === tempId ? savedData.data : a))
        )
      );
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

  const handleUpdate = async (id: string, content: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, content } : a))
    );

    try {
      const res = await fetch(`/api/admin/annotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Annotation updated");
    } catch {
      toast.error("Failed to update");
      fetchAnnotations();
    }
  };

  const displayFileName = fileName ?? "Creative";
  const displayFileTypeLabel =
    fileTypeLabel ?? (creativeType === "image" ? "Image" : "HTML");

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-gray-500">Loading annotations...</p>
        </div>
      </div>
    );
  }

  return (
    <AnnotateCreative
      fileName={displayFileName}
      fileTypeLabel={displayFileTypeLabel}
      fileSize={fileSize}
      creativeUrl={creativeUrl}
      creativeType={creativeType}
      htmlContent={creativeType === "html" ? htmlContent : undefined}
      annotations={annotations}
      pendingAnnotation={pendingAnnotation}
      selectedAnnotation={selectedAnnotation}
      hoveredAnnotationId={hoveredAnnotationId}
      onSaveAnnotation={handleSaveAnnotation}
      onCancelPin={() => setPendingAnnotation(null)}
      onResolve={handleResolve}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
      onAddAnnotation={handleAddAnnotation}
      onSelectAnnotation={(note) => {
        setSelectedAnnotation(note);
        setPendingAnnotation(null);
      }}
      onHoverAnnotation={setHoveredAnnotationId}
      onLeaveAnnotation={() => setHoveredAnnotationId(null)}
      isAddingMode={isAddingMode}
      onToggleAddingMode={handleToggleAddingMode}
      actionLabel={actionLabel}
      onAction={onAction}
      isSubmitting={isSubmitting}
      hideHeader={hideHeader}
      readOnly={readOnly}
    />
  );
}
