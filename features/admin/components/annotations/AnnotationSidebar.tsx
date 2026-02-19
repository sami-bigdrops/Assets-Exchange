import { format } from "date-fns";
import { Pencil, PenLine, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { Annotation, AnnotationPositionData } from "./AnnotationLayer";

function stripHtml(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function isHtmlEmpty(html: string) {
  return stripHtml(html).trim().length === 0;
}

interface AnnotationSidebarProps {
  annotations: Annotation[];
  pendingAnnotation: AnnotationPositionData | null;
  onSave: (content: string) => void;
  onCancel: () => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, content: string) => void;
  selectedAnnotation: Annotation | null;
  onSelectAnnotation?: (annotation: Annotation) => void;
  onHoverAnnotation?: (id: string | null) => void;
  onLeaveAnnotation?: () => void;
  isAddingMode?: boolean;
  onToggleAddingMode?: () => void;
  readOnly?: boolean;
}

export function AnnotationSidebar({
  annotations,
  pendingAnnotation,
  onSave,
  onCancel,
  onResolve: _onResolve,
  onDelete,
  onUpdate,
  selectedAnnotation,
  onSelectAnnotation,
  onHoverAnnotation,
  onLeaveAnnotation,
  isAddingMode = false,
  onToggleAddingMode,
  readOnly = false,
}: AnnotationSidebarProps) {
  const sortedAnnotations = [...annotations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const [comment, setComment] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLongComment = (html: string) => {
    const plain = stripHtml(html);
    return plain.split(/\n/).length > 3 || plain.length > 120;
  };

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
    if (isHtmlEmpty(comment)) return;
    onSave(comment);
    setComment("");
  };

  const handleStartEdit = (note: Annotation) => {
    setEditingCardId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = (id: string) => {
    if (isHtmlEmpty(editContent) || !onUpdate) return;
    onUpdate(id, editContent);
    setEditingCardId(null);
    setEditContent("");
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditContent("");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      <div className="flex h-14 items-center border-b border-gray-200 px-4 sm:px-6 gap-3 shrink-0">
        <div className="p-2 bg-blue-100 rounded-lg">
          <PenLine className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold">Corrections</h2>
        <Badge variant="secondary">{annotations.length}</Badge>
        {!readOnly && onToggleAddingMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAddingMode}
            className={`ml-auto shrink-0 ${
              isAddingMode
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                : ""
            }`}
          >
            {isAddingMode ? "Cancel" : "+ Add Comment"}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 px-3 py-3" ref={scrollRef}>
        <div className="space-y-3">
          {pendingAnnotation && (
            <div className="rounded-lg border-2 border-blue-400 bg-blue-50/50 p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                New Comment
              </p>
              <RichTextEditor
                value={comment}
                onChange={setComment}
                placeholder="Describe the issue..."
                className="border-blue-300 bg-white text-sm [&_[contenteditable]]:min-h-[72px] [&_[contenteditable]]:max-h-[200px]"
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 px-4 text-xs font-medium text-gray-600 border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isHtmlEmpty(comment)}
                  className="h-8 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {annotations.length === 0 && !pendingAnnotation && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No annotations yet. Click on the creative to add one.
            </div>
          )}

          {sortedAnnotations.map((note, index) => {
            const isSelected = selectedAnnotation?.id === note.id;
            const isExpanded = expandedCardId === note.id;
            const isEditing = editingCardId === note.id;
            const isResolved = note.status === "resolved";
            const truncated =
              isLongComment(note.content) && !isExpanded && !isEditing;

            return (
              <div
                key={note.id}
                id={`annotation-card-${note.id}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (isEditing) return;
                    e.preventDefault();
                    onSelectAnnotation?.(note);
                    setExpandedCardId((prev) =>
                      prev === note.id ? null : note.id
                    );
                  }
                }}
                onClick={() => {
                  if (isEditing) return;
                  onSelectAnnotation?.(note);
                  setExpandedCardId((prev) =>
                    prev === note.id ? null : note.id
                  );
                }}
                onMouseEnter={() => onHoverAnnotation?.(note.id)}
                onMouseLeave={() => onLeaveAnnotation?.()}
                className={`group relative rounded-lg border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? isResolved
                      ? "border-green-300 bg-green-50/40"
                      : "border-red-300 bg-red-50/40"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                } ${isResolved && !isSelected ? "opacity-75" : ""}`}
                style={{
                  borderLeftWidth: "3px",
                  borderLeftColor: isResolved ? "#22c55e" : "#ef4444",
                }}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        backgroundColor: isResolved ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(note.createdAt), "MMM d, h:mm a")}
                    </span>
                    {isResolved && (
                      <span className="ml-auto text-[10px] font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                        Resolved
                      </span>
                    )}

                    {!readOnly && !isEditing && (
                      <div
                        className="ml-auto flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isResolved && (
                          <button
                            type="button"
                            className="p-1.5 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            onClick={() => handleStartEdit(note)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => onDelete(note.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Update your comment..."
                        className="border-gray-300 bg-white text-sm [&_[contenteditable]]:min-h-[72px] [&_[contenteditable]]:max-h-[200px]"
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-8 px-4 text-xs font-medium text-gray-600 border-gray-300 hover:bg-gray-100"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={isHtmlEmpty(editContent)}
                          className="h-8 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`text-[13px] leading-relaxed text-gray-700 break-words prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 ${
                          truncated ? "line-clamp-3" : ""
                        }`}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />

                      {isLongComment(note.content) && (
                        <button
                          type="button"
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCardId((prev) =>
                              prev === note.id ? null : note.id
                            );
                          }}
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
