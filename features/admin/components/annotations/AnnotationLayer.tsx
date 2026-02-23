import { useRef, useState, type MouseEvent } from "react";

import { Badge } from "@/components/ui/badge";

export interface Annotation {
  id: string;
  creativeId: string;
  positionData: { x: number; y: number; width?: number; height?: number };
  content: string;
  status: "active" | "resolved";
  adminId: string;
  createdAt: string;
}

interface AnnotationLayerProps {
  creativeUrl: string;
  type: "image" | "html";
  annotations: Annotation[];
  onAddAnnotation: (position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  }) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
  isAddingMode: boolean;
  htmlContent?: string;
  selectedAnnotationId?: string | null;
  pendingPin?: { x: number; y: number; width?: number; height?: number } | null;
  isReadOnly?: boolean;
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
  isReadOnly = false,
}: AnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentBox, setCurrentBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const getRelativeCoords = (e: MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!isAddingMode) return;
    e.preventDefault();
    const coords = getRelativeCoords(e);
    setStartPoint(coords);
    setIsDrawing(true);
    setCurrentBox({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDrawing || !startPoint) return;
    const coords = getRelativeCoords(e);

    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const width = Math.abs(coords.x - startPoint.x);
    const height = Math.abs(coords.y - startPoint.y);

    setCurrentBox({ x, y, width, height });
  };

  const handleInteractionEnd = (e: MouseEvent) => {
    if (!isAddingMode || !isDrawing || !startPoint || !currentBox) {
      setIsDrawing(false);
      return;
    }

    if (currentBox.width > 2 && currentBox.height > 2) {
      onAddAnnotation(currentBox);
    } else {
      // Treated as click/pin
      onAddAnnotation({ x: currentBox.x, y: currentBox.y });
    }

    setIsDrawing(false);
    setCurrentBox(null);
    setStartPoint(null);
    e.stopPropagation(); // Stop click event
  };

  return (
    <div className="relative inline-block border rounded-lg overflow-hidden bg-gray-100 shadow-sm select-none">
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleInteractionEnd}
        onMouseLeave={() => setIsDrawing(false)}
        className={`relative ${isAddingMode && !isReadOnly ? "cursor-crosshair" : "cursor-default"}`}
      >
        {type === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={creativeUrl}
            alt="Creative to review"
            className="block max-w-full max-h-[80vh] w-auto h-auto pointer-events-none"
          />
        ) : (
          <div className="relative w-full">
            <iframe
              srcDoc={
                htmlContent ||
                '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:Arial,sans-serif;color:#666;"><p>Loading HTML content...</p></div>'
              }
              className="w-full h-[80vh] min-w-[600px] border-none pointer-events-none"
              title="HTML Creative"
              sandbox="allow-scripts allow-same-origin"
            />
            {/* Overlay for capturing mouse events over iframe */}
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
            const color = isResolved
              ? "rgba(34,197,94,1)"
              : "rgba(239,68,68,1)";
            const fillColor = isResolved
              ? "rgba(34,197,94,0.1)"
              : "rgba(239,68,68,0.1)";

            if (note.positionData.width && note.positionData.height) {
              return (
                <rect
                  key={`rect-${note.id}`}
                  x={`${note.positionData.x}%`}
                  y={`${note.positionData.y}%`}
                  width={`${note.positionData.width}%`}
                  height={`${note.positionData.height}%`}
                  fill={fillColor}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  rx={4}
                  style={{
                    filter: isSelected
                      ? "drop-shadow(0 0 4px rgba(0,0,0,0.2))"
                      : "none",
                  }}
                />
              );
            }

            // Fallback for pins (connect lines to right edge?)
            // Or just rely on the pin badge which is rendered below.
            // Keeping lines for pins as previously implemented:
            return (
              <line
                key={`line-${note.id}`}
                x1={`${note.positionData.x}%`}
                y1={`${note.positionData.y}%`}
                x2="100%"
                y2={`${note.positionData.y}%`}
                stroke={
                  isSelected
                    ? color
                    : isResolved
                      ? "rgba(34,197,94,0.5)"
                      : "rgba(239,68,68,0.5)"
                }
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Drawing Box Preview */}
          {currentBox && (
            <rect
              x={`${currentBox.x}%`}
              y={`${currentBox.y}%`}
              width={`${currentBox.width}%`}
              height={`${currentBox.height}%`}
              fill="rgba(59,130,246,0.15)"
              stroke="#3b82f6"
              strokeWidth={2}
              rx={4}
              style={{ filter: "drop-shadow(0 4px 6px rgba(59,130,246,0.2))" }}
            />
          )}
        </svg>

        {pendingPin && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${pendingPin.x}%`,
              top: `${pendingPin.y}%`,
              width: pendingPin.width ? `${pendingPin.width}%` : undefined,
              height: pendingPin.height ? `${pendingPin.height}%` : undefined,
              transform: pendingPin.width ? "none" : "translate(-50%, -50%)",
              zIndex: 12,
            }}
          >
            {pendingPin.width ? (
              <div className="w-full h-full border-2 border-blue-500 bg-blue-500/15 rounded-md shadow-lg backdrop-blur-[1px] box-content animate-in fade-in zoom-in duration-200" />
            ) : (
              <>
                <div
                  className="rounded-full animate-ping"
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: "rgba(59,130,246,0.4)",
                    position: "absolute",
                    top: "-20px",
                    left: "-20px",
                  }}
                />
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: "#3b82f6",
                    border: "3px solid white",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.5)",
                    position: "absolute",
                    top: "-12px",
                    left: "-12px",
                  }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </>
            )}
          </div>
        )}

        {annotations.map((note, index) => {
          const isSelected = selectedAnnotationId === note.id;
          const isResolved = note.status === "resolved";
          const hasDimensions =
            note.positionData.width && note.positionData.height;

          return (
            <div key={note.id}>
              {/* Pin/Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(note);
                }}
                className={`absolute rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 ${isSelected ? "scale-110 ring-4 ring-white/50" : "hover:-translate-y-1"}`}
                style={{
                  width: "32px",
                  height: "32px",
                  left: hasDimensions
                    ? `${note.positionData.x + note.positionData.width! / 2}%`
                    : `${note.positionData.x}%`,
                  top: hasDimensions
                    ? `${note.positionData.y + note.positionData.height! / 2}%`
                    : `${note.positionData.y}%`,
                  transform: `translate(-50%, -50%)`,
                  backgroundColor: isResolved ? "#10b981" : "#ef4444",
                  border: "2px solid white",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                  zIndex: 10,
                  boxShadow: `0 4px 14px ${isResolved ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
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
              Click and drag to box, or click to pin
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
