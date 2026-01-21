"use client";

import type { PublisherFormData } from "../hooks/usePublisherForm";

const STORAGE_KEY = "publisher_form_draft";
const FILES_STORAGE_KEY = "publisher_form_files";

export interface SavedFormState {
  formData: PublisherFormData;
  currentStep: number;
  timestamp: number;
}

export interface SavedFileMeta {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  source?: "single" | "zip";
  html?: boolean;
  previewUrl?: string;
  assetCount?: number;
  hasAssets?: boolean;
  fromLines?: string;
  subjectLines?: string;
}

export interface SavedFilesState {
  files: SavedFileMeta[];
  uploadedZipFileName: string;
  timestamp: number;
}

/**
 * Save form data to localStorage
 */
export const saveFormState = (formData: PublisherFormData, currentStep: number): void => {
  try {
    const state: SavedFormState = {
      formData,
      currentStep,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save form state:", error);
  }
};

/**
 * Load saved form data from localStorage
 */
export const loadFormState = (): SavedFormState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const state = JSON.parse(saved) as SavedFormState;
    
    // Check if saved data is older than 7 days, if so, clear it
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (state.timestamp < sevenDaysAgo) {
      clearFormState();
      return null;
    }

    return state;
  } catch (error) {
    console.error("Failed to load form state:", error);
    return null;
  }
};

/**
 * Clear saved form data
 */
export const clearFormState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FILES_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear form state:", error);
  }
};

/**
 * Get estimated size of data in bytes
 */
const getEstimatedSize = (data: unknown): number => {
  return new Blob([JSON.stringify(data)]).size;
};

/**
 * Optimize file metadata for storage - remove large/unnecessary fields
 */
const optimizeFileMeta = (file: SavedFileMeta): SavedFileMeta => {
  const optimized: SavedFileMeta = {
    id: file.id,
    name: file.name,
    // Only store URL if it's not too long (truncate if needed)
    url: file.url.length > 500 ? file.url.substring(0, 500) : file.url,
    size: file.size,
    type: file.type,
    source: file.source,
    html: file.html,
    // Remove previewUrl if it's the same as url to save space
    previewUrl: file.previewUrl && file.previewUrl !== file.url ? 
      (file.previewUrl.length > 500 ? file.previewUrl.substring(0, 500) : file.previewUrl) : 
      undefined,
    assetCount: file.assetCount,
    hasAssets: file.hasAssets,
    // Truncate fromLines/subjectLines if too long (keep first 1000 chars)
    fromLines: file.fromLines && file.fromLines.length > 1000 
      ? file.fromLines.substring(0, 1000) 
      : file.fromLines,
    subjectLines: file.subjectLines && file.subjectLines.length > 1000 
      ? file.subjectLines.substring(0, 1000) 
      : file.subjectLines,
  };
  return optimized;
};

/**
 * Save uploaded files state to localStorage
 */
export const saveFilesState = (files: SavedFileMeta[], uploadedZipFileName: string): void => {
  try {
    // Optimize files data to reduce storage size
    const optimizedFiles = files.map(optimizeFileMeta);
    
    const state: SavedFilesState = {
      files: optimizedFiles,
      uploadedZipFileName,
      timestamp: Date.now(),
    };

    // Estimate size before saving
    const estimatedSize = getEstimatedSize(state);
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB limit (localStorage is usually 5-10MB)

    if (estimatedSize > MAX_SIZE) {
      console.warn("Files state too large, clearing old data and saving minimal info");
      // Clear old data and save only essential info
      clearFilesState();
      
      // Save only minimal data
      const minimalState: SavedFilesState = {
        files: optimizedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.id, // Use ID instead of full URL
          size: f.size,
          type: f.type,
          source: f.source,
          html: f.html,
        })),
        uploadedZipFileName,
        timestamp: Date.now(),
      };
      
      try {
        localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(minimalState));
      } catch (minimalError) {
        console.error("Failed to save minimal files state:", minimalError);
        // If even minimal state fails, clear everything
        clearFilesState();
      }
      return;
    }

    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Handle quota exceeded error specifically
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded, clearing old data and retrying");
      try {
        // Clear old data
        clearFilesState();
        // Try saving minimal data
        const minimalState: SavedFilesState = {
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            url: f.id, // Use ID instead of full URL
            size: f.size,
            type: f.type,
            source: f.source,
            html: f.html,
          })),
          uploadedZipFileName,
          timestamp: Date.now(),
        };
        localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(minimalState));
      } catch (retryError) {
        console.error("Failed to save files state after cleanup:", retryError);
        // If still failing, just clear and don't save
        clearFilesState();
      }
    } else {
      console.error("Failed to save files state:", error);
    }
  }
};

/**
 * Load saved files state from localStorage
 */
export const loadFilesState = (): SavedFilesState | null => {
  try {
    const saved = localStorage.getItem(FILES_STORAGE_KEY);
    if (!saved) {
      console.log("No saved files state found in localStorage");
      return null;
    }

    const state = JSON.parse(saved) as SavedFilesState;
    
    // Check if saved data is older than 7 days, if so, clear it
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (state.timestamp < sevenDaysAgo) {
      clearFilesState();
      return null;
    }
    return state;
  } catch (error) {
    console.error("Failed to load files state:", error);
    return null;
  }
};

/**
 * Clear saved files state
 */
export const clearFilesState = (): void => {
  try {
    localStorage.removeItem(FILES_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear files state:", error);
  }
};
