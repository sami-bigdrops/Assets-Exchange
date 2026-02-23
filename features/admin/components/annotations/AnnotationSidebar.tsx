import { format } from "date-fns";
import { Check, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { type Annotation } from "./AnnotationLayer";
interface AnnotationSidebarProps {
  annotations: Annotation[];
  pendingAnnotation: { x: number; y: number } | null;
  onSave: (content: string) => void;
  onCancel: () => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  selectedAnnotation: Annotation | null;
  isReadOnly?: boolean;
}

export function AnnotationSidebar({
  annotations,
  pendingAnnotation,
  onSave,
  onCancel,
  onResolve,
  onDelete,
  selectedAnnotation,
  isReadOnly = false,
}: AnnotationSidebarProps) {
  const [comment, setComment] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedAnnotation) {
      const el = document.getElementById(
        `annotation-card-${selectedAnnotation.id}`
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedAnnotation]);

  const handleSave = () => {
    if (!comment.trim()) return;
    onSave(comment);
    setComment("");
  };

  return (
    <div className="flex w-80 flex-col border-l bg-gray-50/50">
      <div className="flex h-14 items-center justify-between border-b px-6 bg-white shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
        <Badge
          variant="secondary"
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {annotations.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col">
          {!isReadOnly && pendingAnnotation && (
            <div className="p-4 border-b bg-blue-50/50 animate-in slide-in-from-right-4 duration-200">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  +
                </div>
                <span className="text-xs font-medium text-blue-700">
                  New Comment
                </span>
              </div>
              <Textarea
                placeholder="Type your comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px] bg-white text-sm resize-none mb-3 focus-visible:ring-1"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-7 text-xs px-2"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!comment.trim()}
                  className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {annotations.length === 0 && !pendingAnnotation && (
            <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <span className="text-2xl text-gray-300">💬</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                No comments yet
              </p>
              {!isReadOnly && (
                <p className="text-xs text-muted-foreground mt-1">
                  Click anywhere on the creative to add a note.
                </p>
              )}
            </div>
          )}

          {annotations.map((note, index) => {
            const isSelected = selectedAnnotation?.id === note.id;
            const isResolved = note.status === "resolved";
            const bgColor = isSelected
              ? isResolved
                ? "bg-emerald-50/50"
                : "bg-blue-50/50"
              : "hover:bg-gray-100/50";

            return (
              <div
                key={note.id}
                id={`annotation-card-${note.id}`}
                onClick={() => {
                  const el = document.getElementById(
                    `annotation-card-${note.id}`
                  );
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className={`group relative flex gap-3 p-4 border-b border-gray-100 transition-colors duration-200 cursor-pointer ${bgColor}`}
              >
                {/* Indicator Line for Selected */}
                {isSelected && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${isResolved ? "bg-emerald-500" : "bg-blue-500"}`}
                  />
                )}

                <div className="shrink-0 pt-0.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-1 ring-inset transition-colors
                            ${
                              isResolved
                                ? "bg-emerald-100 text-emerald-700 ring-emerald-200 group-hover:bg-emerald-200"
                                : "bg-rose-100 text-rose-700 ring-rose-200 group-hover:bg-rose-200"
                            }
                            ${isSelected ? "scale-110" : ""}
                        `}
                  >
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-medium text-gray-400">
                      {format(new Date(note.createdAt), "MMM d, h:mm a")}
                    </span>
                    {isResolved && (
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-600">
                        <Check className="h-3 w-3" /> Resolved
                      </div>
                    )}
                  </div>

                  <p
                    className={`text-sm leading-relaxed text-gray-700 ${isResolved ? "line-through opacity-70" : ""}`}
                  >
                    {note.content}
                  </p>

                  <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isReadOnly && !isResolved && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve(note.id);
                        }}
                        title="Resolve"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!isReadOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(note.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
