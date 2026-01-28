import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import {
  loadFormState,
  saveFormState,
  clearFormState,
  loadFilesState,
} from "../utils/autoSave";
import { type SavedFileMeta } from "../utils/autoSave";

export interface PublisherFormData {
  affiliateId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  telegramId: string;
  offerId: string;
  creativeType: string;
  additionalNotes: string;
  fromLines: string;
  subjectLines: string;
  priority: string;
}

export const usePublisherForm = () => {
  const router = useRouter();
  // Load saved state on mount
  const savedState = loadFormState();
  const [currentStep, setCurrentStep] = useState(savedState?.currentStep || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PublisherFormData>(
    savedState?.formData || {
      affiliateId: "",
      companyName: "",
      firstName: "",
      lastName: "",
      email: "",
      telegramId: "",
      offerId: "",
      creativeType: "",
      additionalNotes: "",
      fromLines: "",
      subjectLines: "",
      priority: "medium",
    }
  );

  // Auto-save form data whenever it changes
  useEffect(() => {
    saveFormState(formData, currentStep);
  }, [formData, currentStep]);

  const onDataChange = useCallback((data: Partial<PublisherFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 3) {
      setCurrentStep(step);
    }
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const savedFilesState = loadFilesState();
      const files = savedFilesState?.files || [];

      const payload = {
        ...formData,
        ...(files.length > 0
          ? {
              files: files.map((f: SavedFileMeta) => ({
                id: f.id,
                name: f.name,
                url: f.url,
                size: f.size,
                type: f.type,
                metadata: f.metadata || {
                  fromLines: f.fromLines,
                  subjectLines: f.subjectLines,
                  additionalNotes: f.additionalNotes,
                },
              })),
            }
          : {}),
      };

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to submit form";
        const fieldErrors = errorData.fieldErrors || {};
        const errorDetails =
          Object.keys(fieldErrors).length > 0
            ? `${errorMessage}: ${Object.entries(fieldErrors)
                .map(
                  ([key, value]) =>
                    `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
                )
                .join("; ")}`
            : errorMessage;
        console.error("Submission validation error:", errorData);
        throw new Error(errorDetails);
      }

      const result = await response.json();

      // Clear saved state on successful submission
      clearFormState();

      // Redirect to thank you page with submission details
      const fileCount = files.length;
      let submissionType = "single";

      if (fileCount > 1) {
        submissionType = "multiple";
      } else if (
        fileCount === 0 &&
        (formData.fromLines || formData.subjectLines)
      ) {
        submissionType = "fromSubjectLines";
      }

      const trackingCode = result.trackingCode;
      router.push(
        `/thankyou?type=${submissionType}&count=${fileCount}${trackingCode ? `&trackingCode=${trackingCode}` : ""}`
      );

      return result;
    } catch (error) {
      console.error("Submission error:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    currentStep,
    formData,
    onDataChange,
    nextStep,
    previousStep,
    goToStep,
    isSubmitting,
    handleSubmit,
  };
};
