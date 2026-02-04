import { type ReactNode } from "react";

import ContactDetails from "../components/form/_steps/ContactDetails";
import CreativeDetails from "../components/form/_steps/CreativeDetails";
import PersonalDetails from "../components/form/_steps/PersonalDetails";
import type { useFormValidation } from "../hooks/useFormValidation";
import {
  type EditRequestData,
  type PublisherFormData,
} from "../hooks/usePublisherForm";

interface RenderStepProps {
  step: number;
  formData: PublisherFormData;
  onDataChange: (data: Partial<PublisherFormData>) => void;
  validation: ReturnType<typeof useFormValidation>;
  editData?: EditRequestData | null;
}

export const getStepLabel = (step: number): string => {
  switch (step) {
    case 1:
      return "Personal Details";
    case 2:
      return "Contact Details";
    case 3:
      return "Creative Details";
    default:
      return "Invalid step";
  }
};

export const renderStep = ({
  step,
  formData,
  onDataChange,
  validation,
  editData,
}: RenderStepProps): ReactNode => {
  switch (step) {
    case 1:
      return (
        <PersonalDetails
          formData={formData}
          onDataChange={onDataChange}
          validation={validation}
        />
      );
    case 2:
      return (
        <ContactDetails
          formData={formData}
          onDataChange={onDataChange}
          validation={validation}
        />
      );
    case 3:
      return (
        <CreativeDetails
          formData={formData}
          onDataChange={onDataChange}
          validation={validation}
          initialFiles={editData?.initialFiles}
        />
      );
    default:
      return <div>Invalid step</div>;
  }
};

export const getButtonText = (currentStep: number, isEditing = false) => {
  if (currentStep === 1) {
    return { prev: "", next: "Save & Add Contact Details" };
  } else if (currentStep === 2) {
    return {
      prev: "Edit Personal Details",
      next: "Save & Add Creative Details",
    };
  } else {
    return {
      prev: "Edit Contact Details",
      next: isEditing ? "Resubmit for Approval" : "Submit for Approval",
    };
  }
};
