"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { toast } from "sonner";

import { sanitizeFilename, validateFile } from "@/lib/security";

export type UploadedFile = {
  url: string;
  name: string;
  type: string;
  size: number;
  scanStatus: "pending" | "clean" | "infected";
};

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    const uploadedFiles: UploadedFile[] = [];

    try {
      const uploadPromises = files.map(async (file) => {
        const validation = validateFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          return null;
        }

        const safeName = sanitizeFilename(file.name);

        const newBlob = await upload(safeName, file, {
          access: "public",
          handleUploadUrl: "/api/admin/uploads/auth",
          onUploadProgress: (event) => {
            setUploadProgress((prev) =>
              Math.min(prev + event.percentage / files.length, 100)
            );
          },
        });

        return {
          url: newBlob.url,
          name: safeName,
          type: file.type,
          size: file.size,
          scanStatus: "pending" as const,
        };
      });

      const results = await Promise.all(uploadPromises);
      results.forEach((res) => res && uploadedFiles.push(res));

      return uploadedFiles;
    } catch {
      toast.error("Critical upload error occurred");
      return [];
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return { uploadFiles, isUploading, uploadProgress };
};
