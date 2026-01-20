"use client";

import { X, ExternalLink, FileText, Image, File } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";

export interface CreativeFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type?: string;
  html?: boolean;
  previewUrl?: string;
  source?: string;
}

interface MultipleCreativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatives: CreativeFile[];
  onRemoveCreative: (id: string) => void;
  uploadedZipFileName?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const getFileIcon = (fileName: string, isHtml?: boolean) => {
  const lowerName = fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lowerName)) {
    return <Image className="h-5 w-5 text-blue-500" alt="" />;
  }
  if (/\.(html|htm)$/i.test(lowerName) || isHtml) {
    return <FileText className="h-5 w-5 text-green-500" />;
  }
  return <File className="h-5 w-5 text-gray-500" />;
};

const MultipleCreativesModal: React.FC<MultipleCreativesModalProps> = ({
  isOpen,
  onClose,
  creatives,
  onRemoveCreative,
  uploadedZipFileName,
}) => {
  if (!isOpen) return null;

  const htmlFiles = creatives.filter((c) => c.html || /\.html?$/i.test(c.name));
  const imageFiles = creatives.filter((c) =>
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(c.name)
  );
  const otherFiles = creatives.filter(
    (c) =>
      !c.html &&
      !/\.html?$/i.test(c.name) &&
      !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(c.name)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Multiple Creatives</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
              {creatives.length} files
            </span>
            {uploadedZipFileName && (
              <span className="text-sm font-normal text-gray-500">
                from {uploadedZipFileName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-lg font-bold text-green-700">
                  {htmlFiles.length}
                </p>
                <p className="text-xs text-green-600">HTML Files</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-lg font-bold text-blue-700">
                  {imageFiles.length}
                </p>
                <p className="text-xs text-blue-600">Images</p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <p className="text-lg font-bold text-gray-700">
                  {otherFiles.length}
                </p>
                <p className="text-xs text-gray-600">Other Files</p>
              </div>
            </div>

            {/* File List */}
            <div className="space-y-3">
              {creatives.map((creative) => (
                <div
                  key={creative.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  {/* Preview */}
                  {creative.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={creative.previewUrl}
                      alt={creative.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 flex flex-col items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                      {getFileIcon(creative.name, creative.html)}
                      <span className="text-xs text-gray-500 mt-1">
                        {creative.html
                          ? "HTML"
                          : creative.type?.split("/")[1]?.toUpperCase() ||
                            "FILE"}
                      </span>
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {creative.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">
                        {formatFileSize(creative.size)}
                      </span>
                      {creative.html && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Creative
                        </span>
                      )}
                      {creative.source === "zip" && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                          Extracted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex items-center gap-1"
                    >
                      <a
                        href={creative.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Open</span>
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveCreative(creative.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {creatives.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No files in this upload</p>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-gray-500">
              {creatives.length} file{creatives.length !== 1 ? "s" : ""} ready
              for submission
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultipleCreativesModal;
