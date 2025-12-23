"use client";

import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  disabled = false,
  className,
  style,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const isCommandActive = (command: string): boolean => {
    return document.queryCommandState(command);
  };

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        !className?.includes("offer-modal-rich-text-editor") &&
          isFocused &&
          "ring-2 ring-ring ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={style}
    >
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("bold")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("bold") && "bg-gray-200"
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("italic")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("italic") && "bg-gray-200"
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("underline")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("underline") && "bg-gray-200"
          )}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("insertUnorderedList")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("insertUnorderedList") && "bg-gray-200"
          )}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("insertOrderedList")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("insertOrderedList") && "bg-gray-200"
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("justifyLeft")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("justifyLeft") && "bg-gray-200"
          )}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("justifyCenter")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("justifyCenter") && "bg-gray-200"
          )}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand("justifyRight")}
          disabled={disabled}
          className={cn(
            "h-7 w-7 p-0 hover:bg-gray-200",
            isCommandActive("justifyRight") && "bg-gray-200"
          )}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "min-h-[200px] max-h-[500px] overflow-y-auto p-3 outline-none",
          "prose prose-sm max-w-none",
          "[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2",
          "[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-2",
          "[&_p]:my-2",
          "[&_strong]:font-bold",
          "[&_em]:italic",
          "[&_u]:underline"
        )}
        style={{
          ...style,
          backgroundColor: style?.backgroundColor || "transparent",
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style jsx global>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(156 163 175);
          pointer-events: none;
        }
        .offer-modal-rich-text-editor
          [contenteditable][data-placeholder]:empty:before {
          color: inherit;
        }
      `}</style>
    </div>
  );
}
