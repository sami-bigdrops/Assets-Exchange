import type { useFormValidation } from "../hooks/useFormValidation";
import { type PublisherFormData } from "../hooks/usePublisherForm";

export interface PersonalDetailProps {
  formData: PublisherFormData;
  onDataChange: (data: Partial<PublisherFormData>) => void;
  validation: ReturnType<typeof useFormValidation>;
  onNextOrSubmit?: () => void;
}

export interface ContactDetailsProps {
  formData: PublisherFormData;
  onDataChange: (data: Partial<PublisherFormData>) => void;
  validation: ReturnType<typeof useFormValidation>;
}

export interface CreativeDetailsProps {
  formData: PublisherFormData;
  onDataChange: (data: Partial<PublisherFormData>) => void;
  validation: ReturnType<typeof useFormValidation>;
  initialFiles?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    format?: string | null;
    metadata?: Record<string, unknown>;
  }> | null;
  creativeFilesRef?: React.MutableRefObject<{
    files: Array<{
      id: string;
      name: string;
      url: string;
      size: number;
      type: string;
      source?: "single" | "zip";
      html?: boolean;
      isHidden?: boolean;
      previewUrl?: string;
      assetCount?: number;
      hasAssets?: boolean;
      fromLines?: string;
      subjectLines?: string;
      additionalNotes?: string;
      metadata?: Record<string, unknown>;
    }>;
    uploadedZipFileName: string;
  } | null>;
}
