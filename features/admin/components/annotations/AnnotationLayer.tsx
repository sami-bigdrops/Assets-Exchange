import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type MouseEvent,
} from "react";

import { Badge } from "@/components/ui/badge";

export type AnnotationPositionData = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export interface Annotation {
  id: string;
  creativeId: string;
  positionData: AnnotationPositionData;
  content: string;
  status: "active" | "resolved";
  adminId: string;
  createdAt: string;
}

function isRect(
  p: AnnotationPositionData
): p is { x: number; y: number; width: number; height: number } {
  const w = p.width ?? 0;
  const h = p.height ?? 0;
  return w > 0.5 && h > 0.5;
}

const IFRAME_NO_SCROLL_STYLE =
  "<style>html,body{overflow:hidden !important;}</style>";

const HEIGHT_SCRIPT = `
(function(){
  function report(){ try { var h = Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,1); window.parent.postMessage({type:'creative-html-height',height:h},'*'); } catch(e){} }
  if (document.readyState === 'complete') report(); else window.addEventListener('load', report);
  try { new ResizeObserver(report).observe(document.body); } catch(e){ setInterval(report, 500); }
})();
`;

function getHtmlWithHeightScript(html: string): string {
  const script = `<script>${HEIGHT_SCRIPT}<\/script>`;
  const style = IFRAME_NO_SCROLL_STYLE;
  const trimmed = html.trim();
  if (/<\/body\s*>/i.test(trimmed)) {
    return trimmed.replace(/<\/body\s*>/i, style + script + "</body>");
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${style}<\/head><body>${trimmed}${script}</body></html>`;
}

interface AnnotationLayerProps {
  creativeUrl: string;
  type: "image" | "html";
  annotations: Annotation[];
  onAddAnnotation: (position: AnnotationPositionData) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
  isAddingMode: boolean;
  htmlContent?: string;
  selectedAnnotationId?: string | null;
  hoveredAnnotationId?: string | null;
  connectionPointAnnotationId?: string | null;
  pendingAnnotation?: AnnotationPositionData | null;
  onHoveredRectConnectionPoint?: (
    point: { x: number; y: number } | null
  ) => void;
  readOnly?: boolean;
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
  hoveredAnnotationId = null,
  connectionPointAnnotationId = null,
  pendingAnnotation,
  onHoveredRectConnectionPoint,
  readOnly = false,
}: AnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeContentHeight, setIframeContentHeight] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (type !== "html") return;
    setIframeContentHeight(null);
  }, [htmlContent, type]);

  useEffect(() => {
    if (type !== "html") return;
    const onMessage = (e: MessageEvent) => {
      if (
        e.data?.type === "creative-html-height" &&
        typeof e.data.height === "number"
      ) {
        setIframeContentHeight(e.data.height);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [type]);

  const updateConnectionPoint = useCallback(() => {
    const id = connectionPointAnnotationId;
    if (!onHoveredRectConnectionPoint || !id || !containerRef.current) {
      if (!id && onHoveredRectConnectionPoint)
        onHoveredRectConnectionPoint(null);
      return;
    }
    const note = annotations.find((a) => a.id === id);
    if (!note || !isRect(note.positionData)) {
      onHoveredRectConnectionPoint(null);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const pd = note.positionData;
    const rightX =
      containerRect.left +
      ((pd.x + (pd.width ?? 0)) / 100) * containerRect.width;
    const centerY =
      containerRect.top +
      ((pd.y + (pd.height ?? 0) / 2) / 100) * containerRect.height;
    onHoveredRectConnectionPoint({ x: rightX, y: centerY });
  }, [connectionPointAnnotationId, annotations, onHoveredRectConnectionPoint]);

  useEffect(() => {
    updateConnectionPoint();
    if (!connectionPointAnnotationId) return;
    const onUpdate = () => updateConnectionPoint();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, [connectionPointAnnotationId, updateConnectionPoint]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragCurrent, setDragCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const toPercent = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100)
    );
    const y = Math.max(
      0,
      Math.min(100, ((clientY - rect.top) / rect.height) * 100)
    );
    return { x, y };
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (readOnly || !isAddingMode || !containerRef.current) return;
      const point = toPercent(e.clientX, e.clientY);
      if (point) {
        setDragStart(point);
        setDragCurrent(point);
      }
    },
    [readOnly, isAddingMode, toPercent]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (dragStart === null) return;
      const point = toPercent(e.clientX, e.clientY);
      if (point) setDragCurrent(point);
    },
    [dragStart, toPercent]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (dragStart === null || dragCurrent === null) return;
      const x1 = Math.min(dragStart.x, dragCurrent.x);
      const y1 = Math.min(dragStart.y, dragCurrent.y);
      const x2 = Math.max(dragStart.x, dragCurrent.x);
      const y2 = Math.max(dragStart.y, dragCurrent.y);
      let width = x2 - x1;
      let height = y2 - y1;
      if (width < 1 && height < 1) {
        width = 0;
        height = 0;
      }
      onAddAnnotation({ x: x1, y: y1, width, height });
      setDragStart(null);
      setDragCurrent(null);
      e.preventDefault();
      e.stopPropagation();
    },
    [dragStart, dragCurrent, onAddAnnotation]
  );

  const handleMouseLeave = useCallback(() => {
    if (dragStart !== null) {
      setDragStart(null);
      setDragCurrent(null);
    }
  }, [dragStart]);

  const drawingRect =
    dragStart && dragCurrent
      ? (() => {
          const x = Math.min(dragStart.x, dragCurrent.x);
          const y = Math.min(dragStart.y, dragCurrent.y);
          const w = Math.abs(dragCurrent.x - dragStart.x);
          const h = Math.abs(dragCurrent.y - dragStart.y);
          return { x, y, w, h };
        })()
      : null;

  return (
    <div className="relative w-full min-h-full border rounded-lg overflow-hidden bg-gray-100">
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full min-h-full select-none ${isAddingMode ? "cursor-crosshair" : "cursor-default"}`}
        style={{ userSelect: "none" }}
      >
        {type === "image" ? (
          <div className="relative w-full min-h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creativeUrl}
              alt="Creative to review"
              className="max-w-full w-full h-auto block pointer-events-none"
              draggable={false}
            />
          </div>
        ) : (
          <div
            className="relative w-full min-h-full"
            style={
              iframeContentHeight != null
                ? { height: iframeContentHeight }
                : undefined
            }
          >
            <iframe
              srcDoc={getHtmlWithHeightScript(
                htmlContent ||
                  '<div style="display:flex;align-items:center;justify-content:center;min-height:400px;font-family:Arial,sans-serif;color:#666;"><p>Loading HTML content...</p></div>'
              )}
              className={`w-full h-full border-0 ${isAddingMode ? "pointer-events-none" : "pointer-events-auto"}`}
              title="HTML Creative"
              sandbox="allow-scripts allow-same-origin"
            />
            {isAddingMode && (
              <div className="absolute inset-0 cursor-crosshair pointer-events-auto" />
            )}
          </div>
        )}

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 5, overflow: "visible" }}
        >
          {drawingRect && (
            <rect
              x={`${drawingRect.x}%`}
              y={`${drawingRect.y}%`}
              width={`${drawingRect.w}%`}
              height={`${drawingRect.h}%`}
              fill="rgba(59,130,246,0.2)"
              stroke="rgba(59,130,246,0.9)"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
          {annotations.map((note) => {
            const isSelected = selectedAnnotationId === note.id;
            const isHovered = hoveredAnnotationId === note.id;
            const isResolved = note.status === "resolved";
            const showFill = isSelected || isHovered;
            const fillColor = showFill
              ? isResolved
                ? "rgba(34,197,94,0.06)"
                : "rgba(239,68,68,0.06)"
              : "transparent";
            const strokeColor = isResolved
              ? isSelected || isHovered
                ? "rgba(34,197,94,1)"
                : "rgba(34,197,94,0.6)"
              : isSelected || isHovered
                ? "rgba(239,68,68,1)"
                : "rgba(239,68,68,0.6)";
            if (isRect(note.positionData)) {
              return (
                <g key={note.id}>
                  <rect
                    x={`${note.positionData.x}%`}
                    y={`${note.positionData.y}%`}
                    width={`${note.positionData.width}%`}
                    height={`${note.positionData.height}%`}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                    strokeDasharray={isSelected || isHovered ? "none" : "6 3"}
                  />
                </g>
              );
            }
            return null;
          })}
        </svg>

        {pendingAnnotation && isRect(pendingAnnotation) && (
          <rect
            x={`${pendingAnnotation.x}%`}
            y={`${pendingAnnotation.y}%`}
            width={`${pendingAnnotation.width}%`}
            height={`${pendingAnnotation.height}%`}
            fill="rgba(59,130,246,0.15)"
            stroke="rgba(59,130,246,0.9)"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        )}

        {pendingAnnotation && !isRect(pendingAnnotation) && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${pendingAnnotation.x}%`,
              top: `${pendingAnnotation.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 12,
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: "rgba(59,130,246,0.8)",
                border: "3px solid white",
                boxShadow: "0 0 0 3px rgba(59,130,246,0.4)",
              }}
            />
          </div>
        )}

        {annotations.map((note, index) => {
          if (isRect(note.positionData)) {
            const isResolved = note.status === "resolved";
            const pd = note.positionData;
            return (
              <button
                key={note.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(note);
                }}
                className="absolute flex items-start justify-start pt-0.5 pl-0.5 transition-opacity"
                style={{
                  left: `${pd.x}%`,
                  top: `${pd.y}%`,
                  width: `${Math.max(pd.width ?? 0, 4)}%`,
                  height: `${Math.max(pd.height ?? 0, 4)}%`,
                  minWidth: "24px",
                  minHeight: "24px",
                  backgroundColor: "transparent",
                  border: "none",
                  zIndex: 10,
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow"
                  style={{
                    backgroundColor: isResolved ? "#22c55e" : "#ef4444",
                    border: `1.5px solid ${isResolved ? "#15803d" : "#b91c1c"}`,
                  }}
                >
                  {index + 1}
                </span>
              </button>
            );
          }
          const isSelected = selectedAnnotationId === note.id;
          const isResolved = note.status === "resolved";
          const pd = note.positionData;
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
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(note);
                }}
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

        {isAddingMode && !readOnly && (
          <div
            className="absolute top-2 right-2 pointer-events-none"
            style={{ zIndex: 15 }}
          >
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-800 border-yellow-300"
            >
              Drag to draw a rectangle
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
