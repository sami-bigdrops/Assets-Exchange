"use client";

import {
  Upload,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  X,
  Loader2,
} from "lucide-react";
import React from "react";


import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  useFileUploadModal,
  type UploadType,
} from "@/features/publisher/view-models/fileUploadModal.viewModel";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadType: UploadType;
  onFileUpload: (file: File) => Promise<void> | void;
  uploadProgress?: number;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  uploadType,
  onFileUpload,
  uploadProgress = 0,
}) => {
  const variables = getVariables();
  const {
    selectedFile,
    dragActive,
    uploadStatus,
    errorMessage,
    config,
    formatFileSize,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleClose,
  } = useFileUploadModal({
    isOpen,
    uploadType,
    onFileUpload,
    onClose,
  });

  const getModalTitle = () => {
    return uploadType === "single"
      ? "Upload Single Creative"
      : "Upload Multiple Creatives";
  };

  const getDragDropContent = () => {
    if (uploadStatus === "uploading") {
      return (
        <div className="space-y-4">
          <Loader2
            className="h-10 w-10 mx-auto animate-spin"
            style={{ color: variables.colors.titleColor }}
          />

          <Progress value={uploadProgress} />

          <p
            className="text-sm font-medium text-center"
            style={{ color: variables.colors.titleColor }}
          >
            Uploading… {Math.round(uploadProgress)}%
          </p>

          <p
            className="text-xs text-center"
            style={{ color: variables.colors.descriptionColor }}
          >
            Please wait while your file is being uploaded
          </p>
        </div>
      );
    }

    if (uploadStatus === "success") {
      return (
        <div className="space-y-3">
          <CheckCircle
            className="h-12 w-12 mx-auto"
            style={{ color: variables.colors.titleColor }}
          />
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: variables.colors.titleColor }}
            >
              Upload Successful!
            </p>
            <p
              className="text-xs"
              style={{ color: variables.colors.descriptionColor }}
            >
              File uploaded successfully
            </p>
          </div>
        </div>
      );
    }

    if (selectedFile) {
      return (
        <div className="space-y-3">
          <CheckCircle
            className="h-12 w-12 mx-auto"
            style={{ color: variables.colors.titleColor }}
          />
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: variables.colors.titleColor }}
            >
              {selectedFile.name}
            </p>
            <p
              className="text-xs"
              style={{ color: variables.colors.descriptionColor }}
            >
              {formatFileSize(selectedFile.size)}
            </p>
            {uploadType === "multiple" && (
              <p
                className="text-xs font-medium mt-1"
                style={{ color: variables.colors.titleColor }}
              >
                ZIP file ready for upload
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <Upload
          className="h-12 w-12 mx-auto"
          style={{ color: variables.colors.descriptionColor }}
        />
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: variables.colors.titleColor }}
          >
            {config.PLACEHOLDER}
          </p>
          <p
            className="text-xs"
            style={{ color: variables.colors.descriptionColor }}
          >
            or click to browse
          </p>
        </div>
      </div>
    );
  };

  const getDragDropBorderColor = () => {
    if (uploadStatus === "success") {
      return variables.colors.titleColor;
    }
    if (dragActive || selectedFile) {
      return variables.colors.inputRingColor;
    }
    return variables.colors.inputBorderColor;
  };

  const getDragDropBackgroundColor = () => {
    if (uploadStatus === "success") {
      return variables.colors.background;
    }
    if (dragActive || selectedFile) {
      return variables.colors.background;
    }
    return variables.colors.inputBackgroundColor;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md"
        style={{
          backgroundColor: variables.colors.cardBackground,
        }}
      >
        <DialogDescription className="sr-only">
          Upload file dialog
        </DialogDescription>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Upload
                className="h-6 w-6"
                style={{ color: variables.colors.titleColor }}
              />
              <DialogTitle>{getModalTitle()}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-red-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {uploadType === "multiple" && (
              <div
                className="p-3 rounded-md border"
                style={{
                  backgroundColor: variables.colors.background,
                  borderColor: variables.colors.inputBorderColor,
                }}
              >
                <div className="flex items-start gap-2">
                  <FolderOpen
                    className="h-4 w-4 mt-0.5"
                    style={{ color: variables.colors.titleColor }}
                  />
                  <div className="text-sm">
                    <p
                      className="font-medium mb-1"
                      style={{ color: variables.colors.titleColor }}
                    >
                      ZIP File Requirements:
                    </p>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      {config.REQUIREMENTS?.map((req, index) => (
                        <li
                          key={index}
                          style={{
                            color: variables.colors.descriptionColor,
                          }}
                        >
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
              style={{
                borderColor: getDragDropBorderColor(),
                backgroundColor: getDragDropBackgroundColor(),
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => {
                if (!selectedFile) {
                  document.getElementById("file-upload")?.click();
                }
              }}
            >
              {getDragDropContent()}
            </div>

            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileInput}
              accept={config.ACCEPT_EXTENSIONS}
              disabled={uploadStatus === "uploading"}
            />

            {!selectedFile && uploadStatus !== "uploading" && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                  className="w-full h-12 font-inter font-medium"
                  style={{
                    backgroundColor:
                      variables.colors.buttonOutlineBackgroundColor,
                    borderColor: variables.colors.buttonOutlineBorderColor,
                    color: variables.colors.buttonOutlineTextColor,
                  }}
                >
                  Browse {uploadType === "single" ? "Files" : "ZIP Files"}
                </Button>
              </div>
            )}

            {uploadStatus === "uploading" && (
              <div className="text-center">
                <Button
                  disabled
                  className="w-full h-12 font-inter font-medium"
                  style={{
                    backgroundColor:
                      variables.colors.buttonDefaultBackgroundColor,
                    color: variables.colors.buttonDefaultTextColor,
                  }}
                >
                  Uploading
                </Button>
              </div>
            )}

            {errorMessage && (
              <div
                className="p-3 rounded-md border flex items-center gap-2"
                style={{
                  backgroundColor: variables.colors.background,
                  borderColor: variables.colors.inputErrorColor,
                }}
              >
                <AlertCircle
                  className="h-4 w-4"
                  style={{ color: variables.colors.inputErrorColor }}
                />
                <p
                  className="text-sm"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {errorMessage}
                </p>
              </div>
            )}

            {selectedFile && uploadStatus !== "uploading" && (
              <div
                className="p-3 rounded-md border"
                style={{
                  backgroundColor: variables.colors.background,
                  borderColor: variables.colors.inputBorderColor,
                }}
              >
                <div className="flex items-center gap-2">
                  <Upload
                    className="h-4 w-4"
                    style={{ color: variables.colors.descriptionColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: variables.colors.titleColor,
                      }}
                    >
                      {selectedFile.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: variables.colors.descriptionColor,
                      }}
                    >
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;
