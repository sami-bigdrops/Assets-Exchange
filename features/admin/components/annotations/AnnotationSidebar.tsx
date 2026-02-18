import { format } from "date-fns";
import { Check, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
}

export function AnnotationSidebar({
  annotations,
  pendingAnnotation,
  onSave,
  onCancel,
  onResolve,
  onDelete,
  selectedAnnotation,
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
    <div className="flex w-80 flex-col border-l bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <h2 className="text-lg font-semibold">Annotations</h2>
        <Badge variant="secondary" className="ml-auto">
          {annotations.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {pendingAnnotation && (
            <Card className="border-2 border-blue-500 shadow-lg shadow-blue-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">
                  New Comment
                </CardTitle>
                <CardDescription>
                  At position {Math.round(pendingAnnotation.x)}%,{" "}
                  {Math.round(pendingAnnotation.y)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Textarea
                  placeholder="Describe the issue..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px]"
                  autoFocus
                />
              </CardContent>
              <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!comment.trim()}
                >
                  Save
                </Button>
              </CardFooter>
            </Card>
          )}

          {annotations.length === 0 && !pendingAnnotation && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No annotations yet. Click on the creative to add one.
            </div>
          )}

          {annotations.map((note, index) => {
            const isSelected = selectedAnnotation?.id === note.id;
            const isResolved = note.status === "resolved";
            const accentColor = isResolved ? "#22c55e" : "#ef4444";

            return (
              <Card
                key={note.id}
                id={`annotation-card-${note.id}`}
                className="transition-all duration-200"
                style={{
                  borderLeft: `4px solid ${accentColor}`,
                  backgroundColor: isSelected
                    ? isResolved
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(239,68,68,0.08)"
                    : undefined,
                  boxShadow: isSelected
                    ? `0 0 0 2px ${accentColor}40, 0 4px 12px ${accentColor}20`
                    : undefined,
                  opacity: isResolved && !isSelected ? 0.6 : 1,
                }}
              >
                <CardHeader className="p-4 pb-2 space-y-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        {index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {isResolved && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-200 bg-green-50"
                      >
                        Resolved
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={() => onDelete(note.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {!isResolved && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => onResolve(note.id)}
                      title="Mark as Resolved"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
