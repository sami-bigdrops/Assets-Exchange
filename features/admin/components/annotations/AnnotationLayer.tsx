import { useRef, type MouseEvent } from "react";

import { Badge } from "@/components/ui/badge";

export interface Annotation {
  id: string;
  creativeId: string;
  positionData: { x: number; y: number };
  content: string;
  status: "active" | "resolved";
  adminId: string;
  createdAt: string;
}

interface AnnotationLayerProps {
  creativeUrl: string;
  type: "image" | "html";
  annotations: Annotation[];
  onAddAnnotation: (position: { x: number; y: number }) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
  isAddingMode: boolean;
  htmlContent?: string;
  selectedAnnotationId?: string | null;
  pendingPin?: { x: number; y: number } | null;
}

export function AnnotationLayer({
  creativeUrl,
  type,
  annotations,
  onAddAnnotation,
  onSelectAnnotation,
  isAddingMode,
  htmlContent,
  selectedAnnotationId,
  pendingPin,
}: AnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = (e: MouseEvent) => {
    if (!isAddingMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onAddAnnotation({ x, y });
  };

  return (
    <div className="relative inline-block w-full max-w-4xl border rounded-lg overflow-hidden bg-gray-100">
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative ${isAddingMode ? "cursor-crosshair" : "cursor-default"}`}
      >
        {type === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={creativeUrl}
            alt="Creative to review"
            className="w-full h-auto block"
          />
        ) : (
          <div className="relative w-full">
            <iframe
              srcDoc={
                htmlContent ||
                '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:Arial,sans-serif;color:#666;"><p>Loading HTML content...</p></div>'
              }
              className="w-full h-[600px] border-none"
              title="HTML Creative"
              sandbox="allow-scripts allow-same-origin"
            />
            {isAddingMode && (
              <div className="absolute inset-0 cursor-crosshair" />
            )}
          </div>
        )}

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5, overflow: "visible" }}
        >
          {annotations.map((note) => {
            const isSelected = selectedAnnotationId === note.id;
            const isResolved = note.status === "resolved";
            const lineColor = isResolved
              ? "rgba(34,197,94,0.6)"
              : "rgba(239,68,68,0.6)";
            const selectedLineColor = isResolved
              ? "rgba(34,197,94,1)"
              : "rgba(239,68,68,1)";
            return (
              <line
                key={`line-${note.id}`}
                x1={`${note.positionData.x}%`}
                y1={`${note.positionData.y}%`}
                x2="100%"
                y2={`${note.positionData.y}%`}
                stroke={isSelected ? selectedLineColor : lineColor}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={isSelected ? "none" : "6 3"}
              />
            );
          })}
        </svg>

        {pendingPin && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${pendingPin.x}%`,
              top: `${pendingPin.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 12,
            }}
          >
            <div
              className="rounded-full animate-ping"
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: "rgba(59,130,246,0.3)",
                position: "absolute",
                top: "-20px",
                left: "-20px",
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "rgba(59,130,246,0.8)",
                border: "3px solid white",
                boxShadow: "0 0 0 3px rgba(59,130,246,0.4)",
                position: "absolute",
                top: "-8px",
                left: "-8px",
              }}
            />
          </div>
        )}

        {annotations.map((note, index) => {
          const isSelected = selectedAnnotationId === note.id;
          const isResolved = note.status === "resolved";

          return (
            <div key={note.id}>
              <div
                className="absolute rounded-full pointer-events-none transition-all duration-200"
                style={{
                  left: `${note.positionData.x}%`,
                  top: `${note.positionData.y}%`,
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
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(note);
                }}
                className="absolute rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
                style={{
                  width: "32px",
                  height: "32px",
                  left: `${note.positionData.x}%`,
                  top: `${note.positionData.y}%`,
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

        {isAddingMode && (
          <div
            className="absolute top-2 right-2 pointer-events-none"
            style={{ zIndex: 15 }}
          >
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-800 border-yellow-300"
            >
              Click anywhere to add a comment
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
