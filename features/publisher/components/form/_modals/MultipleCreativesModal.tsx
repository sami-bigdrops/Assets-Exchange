"use client";

import { FileArchive, FileText, File, X, Edit3, Check } from "lucide-react";
import React, { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatFileSize } from "@/constants";
import {
  useMultipleCreativesModal,
  type CreativeFile,
} from "@/features/publisher/view-models/multipleCreativesModal.viewModel";

import SingleCreativeViewModal from "./SingleCreativeViewModal";

interface MultipleCreativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatives: CreativeFile[];
  onRemoveCreative: (id: string) => void;
  uploadedZipFileName?: string;
  onFileNameChange?: (fileId: string, newFileName: string) => void;
  onZipFileNameChange?: (newZipFileName: string) => void;
  creativeType?: string;
  onMetadataChange?: (
    fileId: string,
    metadata: {
      fromLines?: string;
      subjectLines?: string;
      additionalNotes?: string;
    }
  ) => void;
  viewOnly?: boolean;
  onSaveAndSubmit?: (metadata: {
    fromLines: string;
    subjectLines: string;
    additionalNotes: string;
  }) => Promise<void>;
}

const MultipleCreativesModal: React.FC<MultipleCreativesModalProps> = ({
  isOpen,
  onClose,
  creatives,
  onRemoveCreative,
  uploadedZipFileName,
  onFileNameChange,
  onZipFileNameChange,
  creativeType = "email",
  viewOnly = false,
  onSaveAndSubmit,
}) => {
  const viewModel = useMultipleCreativesModal({
    isOpen,
    creatives,
    onRemoveCreative,
    onFileNameChange,
    onZipFileNameChange,
    creativeType,
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      // ... (lines 58-378 remain same, only showing relevant context)

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    };
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const htmlFiles = creatives.filter(
    (c) => (c.html || /\.html?$/i.test(c.name)) && !c.isHidden
  );
  const imageFiles = creatives.filter(
    (c) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(c.name) && !c.isHidden
  );
  const otherFiles = creatives.filter(
    (c) =>
      !c.html &&
      !/\.html?$/i.test(c.name) &&
      !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(c.name) &&
      !c.isHidden
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="h-screen! max-w-screen! max-h-screen! rounded-none p-0 flex flex-col">
          <DialogDescription className="sr-only">
            Multiple creatives view
          </DialogDescription>
          <DialogHeader className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-xl shadow-sm shrink-0">
                  <FileArchive className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="min-w-0">
                    {viewModel.isEditingZipFileName ? (
                      <div className="flex items-center gap-2 sm:gap-3 mb-0.5 sm:mb-1">
                        <div className="flex items-center">
                          <Input
                            value={viewModel.editableZipNameOnly || ""}
                            onChange={(e) =>
                              viewModel.handleZipFileNameChange(
                                e,
                                uploadedZipFileName || "Multiple Creatives.zip"
                              )
                            }
                            onKeyDown={(e) =>
                              viewModel.handleZipFileNameKeyDown(
                                e,
                                uploadedZipFileName || "Multiple Creatives.zip"
                              )
                            }
                            className="text-xs sm:text-sm font-medium h-8 sm:h-9 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white px-3 py-2 w-auto min-w-0"
                            autoFocus
                            placeholder="Filename"
                          />
                          <span className="text-xs sm:text-sm text-gray-700 font-medium px-2 py-2 h-8 sm:h-9 flex items-center whitespace-nowrap">
                            {uploadedZipFileName
                              ? uploadedZipFileName.substring(
                                  uploadedZipFileName.lastIndexOf(".")
                                )
                              : ".zip"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              viewModel.handleZipFileNameSave(
                                uploadedZipFileName || "Multiple Creatives.zip"
                              )
                            }
                            className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              viewModel.handleZipFileNameCancel(
                                uploadedZipFileName || "Multiple Creatives.zip"
                              )
                            }
                            className="h-9 w-9 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                        <DialogTitle className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
                          {uploadedZipFileName || "Multiple Creatives"}
                        </DialogTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            viewModel.handleZipFileNameEdit(
                              uploadedZipFileName || "Multiple Creatives.zip"
                            )
                          }
                          className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {creatives.length} files
                    </span>
                    <span className="text-gray-600 text-xs">•</span>
                    <span className="text-xs text-gray-600">ZIP Archive</span>
                  </div>
                </div>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={onClose}
                className="h-9 px-3 sm:px-4 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm shrink-0"
              >
                <span>Save and Continue</span>
              </Button>
            </div>
          </DialogHeader>

          <DialogBody className="p-3 sm:p-4 lg:p-6 bg-gray-50 overflow-y-auto flex-1 pb-0 max-h-screen!">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
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

            {/* Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
              {creatives
                .filter((c) => !c.isHidden)
                .map((creative) => {
                  const fileType = viewModel.getFileType(creative.name);
                  const isImage = fileType === "image";
                  const isHtml = fileType === "html";

                  return (
                    <div
                      key={creative.id}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden group"
                    >
                      {/* Preview Section */}
                      <div className="aspect-4/3 bg-gray-50 overflow-hidden relative">
                        {isImage && (creative.previewUrl || creative.url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={creative.previewUrl || creative.url}
                            alt={creative.name}
                            className="w-full h-full object-cover"
                          />
                        ) : isHtml ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50">
                            <div className="text-center">
                              <FileText className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                              <p className="text-xs font-medium text-emerald-700">
                                HTML
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-50">
                            <div className="text-center">
                              <File className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                              <p className="text-xs font-medium text-slate-600">
                                File
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons - Top Right */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewModel.handleDeleteCreative(creative);
                            }}
                            disabled={viewModel.isDeleting === creative.id}
                            className="h-9 px-2 bg-white/95 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs font-medium shadow-sm"
                          >
                            {viewModel.isDeleting === creative.id ? (
                              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-3 sm:p-4">
                        {/* Filename and File Info */}
                        <div className="mb-3">
                          <h3
                            className="font-medium text-gray-900 text-xs sm:text-sm truncate mb-1"
                            title={creative.name}
                          >
                            {creative.name}
                          </h3>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span
                              className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full font-medium text-xs ${
                                isImage
                                  ? "bg-blue-50 text-blue-600"
                                  : isHtml
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-gray-50 text-gray-600"
                              }`}
                            >
                              {fileType}
                            </span>
                            <span className="font-medium text-xs">
                              {formatFileSize(creative.size)}
                            </span>
                          </div>
                        </div>

                        {/* View Button */}
                        <Button
                          onClick={() =>
                            viewModel.openSingleCreativeView(creative)
                          }
                          className="w-full h-9 bg-blue-400 hover:bg-blue-600 text-white font-medium px-3 sm:px-4 rounded-md text-xs sm:text-sm transition-colors duration-200"
                        >
                          <span>View Creative</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {creatives.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No files in this upload</p>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* SingleCreativeViewModal - Opens when View Creative is clicked */}
      {viewModel.selectedCreative && (
        <SingleCreativeViewModal
          isOpen={viewModel.isSingleCreativeViewOpen}
          onClose={viewModel.closeSingleCreativeView}
          creative={{
            id: viewModel.selectedCreative.id,
            name: viewModel.selectedCreative.name,
            url: viewModel.selectedCreative.url,
            size: viewModel.selectedCreative.size,
            type: viewModel.selectedCreative.type || "application/octet-stream",
            previewUrl: viewModel.selectedCreative.previewUrl,
            html: viewModel.selectedCreative.html,
            metadata: viewModel.selectedCreative.metadata,
          }}
          onFileNameChange={viewModel.handleFileNameChangeFromSingle}
          showAdditionalNotes={true}
          creativeType={creativeType}
          siblingCreatives={creatives.map((c) => ({
            id: c.id,
            name: c.name,
            url: c.url,
            size: c.size,
            type: c.type || "application/octet-stream",
            previewUrl: c.previewUrl,
            html: c.html,
            uploadId: c.uploadId,
            metadata: c.metadata,
          }))}
          viewOnly={viewOnly}
          onSaveAndSubmit={onSaveAndSubmit}
        />
      )}
    </>
  );
};

export default MultipleCreativesModal;
