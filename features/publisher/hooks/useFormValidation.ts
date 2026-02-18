import { useState, useCallback, useMemo } from "react";

import {
  validatePersonalDetails,
  validateContactDetails,
  validateCreativeDetails,
  validateForm,
  validateField,
  type ValidationResult,
} from "@/features/publisher/utils/validation";

import type { PublisherFormData } from "./usePublisherForm";

export interface ValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
}

export const useFormValidation = (_initialFormData: PublisherFormData) => {
  const keepValidation = true;

  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    touched: {},
    isValid: false,
  });
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [hasFromSubjectLines, setHasFromSubjectLines] = useState(false);

  const updateFormData = useCallback(
    (_updates: Partial<PublisherFormData>) => {},
    []
  );

  const markFieldAsTouched = useCallback((fieldName: string) => {
    setValidationState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [fieldName]: true },
    }));
  }, []);

  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      markFieldAsTouched(fieldName);
    },
    [markFieldAsTouched]
  );

  const validateSingleField = useCallback(
    (fieldName: keyof PublisherFormData, value: string) => {
      if (!keepValidation) {
        return "";
      }
      const result = validateField(fieldName, value);
      return result.error || "";
    },
    [keepValidation]
  );

  const handleFieldChange = useCallback(
    (fieldName: keyof PublisherFormData, value: string) => {
      if (!keepValidation) {
        return;
      }
      const result = validateField(fieldName, value);
      const error = result.error || "";

      setValidationState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fieldName]: error,
        },
      }));
    },
    [keepValidation]
  );

  const validatePersonalDetailsStep = useCallback(
    (formData: Partial<PublisherFormData>): ValidationResult => {
      if (!keepValidation) {
        return {
          valid: true,
          errors: {},
        };
      }

      const result = validatePersonalDetails({
        affiliateId: formData.affiliateId || "",
        companyName: formData.companyName || "",
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
      });

      const fieldsToTouch: Array<keyof PublisherFormData> = [
        "affiliateId",
        "companyName",
        "firstName",
        "lastName",
      ];

      const touchedFields: Record<string, boolean> = {};
      fieldsToTouch.forEach((field) => {
        touchedFields[field] = true;
      });

      setValidationState((prev) => ({
        ...prev,
        errors: { ...prev.errors, ...result.errors },
        touched: { ...prev.touched, ...touchedFields },
      }));

      return result;
    },
    [keepValidation]
  );

  const validateContactDetailsStep = useCallback(
    (formData: Partial<PublisherFormData>): ValidationResult => {
      if (!keepValidation) {
        return {
          valid: true,
          errors: {},
        };
      }

      const result = validateContactDetails({
        email: formData.email || "",
        telegramId: formData.telegramId || "",
      });

      const fieldsToTouch: Array<keyof PublisherFormData> = [
        "email",
        "telegramId",
      ];

      const touchedFields: Record<string, boolean> = {};
      fieldsToTouch.forEach((field) => {
        touchedFields[field] = true;
      });

      setValidationState((prev) => ({
        ...prev,
        errors: { ...prev.errors, ...result.errors },
        touched: { ...prev.touched, ...touchedFields },
      }));

      return result;
    },
    [keepValidation]
  );

  const validateCreativeDetailsStep = useCallback(
    (
      formData: Partial<PublisherFormData>,
      hasFiles: boolean,
      hasLines: boolean
    ): ValidationResult => {
      if (!keepValidation) {
        return {
          valid: true,
          errors: {},
        };
      }

      const errors: Record<string, string> = {};

      const result = validateCreativeDetails({
        offerId: formData.offerId || "",
        creativeType: formData.creativeType || "",
        fromLines: formData.fromLines || "",
        subjectLines: formData.subjectLines || "",
      });

      Object.assign(errors, result.errors);

      if (!formData.creativeType) {
        errors.creativeType =
          errors.creativeType || "Please select a creative type";
      } else {
        if (formData.creativeType === "email") {
          if (!hasFiles && !hasLines) {
            errors.creativeType =
              "Please upload files or add from/subject lines";
          }
        } else {
          if (!hasFiles) {
            errors.creativeType = "Please upload at least one creative file";
          }
        }
      }

      const fieldsToTouch: Array<keyof PublisherFormData> = [
        "offerId",
        "creativeType",
        "fromLines",
        "subjectLines",
      ];

      const touchedFields: Record<string, boolean> = {};
      fieldsToTouch.forEach((field) => {
        touchedFields[field] = true;
      });

      setValidationState((prev) => ({
        ...prev,
        errors: { ...prev.errors, ...errors },
        touched: { ...prev.touched, ...touchedFields },
      }));

      return {
        valid: Object.keys(errors).length === 0,
        errors,
      };
    },
    [keepValidation]
  );

  const validateCompleteFormData = useCallback(
    (
      formData: PublisherFormData,
      hasFiles: boolean,
      hasLines: boolean
    ): ValidationResult => {
      if (!keepValidation) {
        return {
          valid: true,
          errors: {},
        };
      }

      const result = validateForm(formData);

      const errors = { ...result.errors };

      if (formData.creativeType === "email") {
        if (!hasFiles && !hasLines) {
          errors.creativeType =
            errors.creativeType ||
            "Please upload files or add from/subject lines";
        }
      } else {
        if (!hasFiles) {
          errors.creativeType =
            errors.creativeType || "Please upload at least one creative file";
        }
      }

      const allFields: Array<keyof PublisherFormData> = [
        "affiliateId",
        "companyName",
        "firstName",
        "lastName",
        "email",
        "telegramId",
        "offerId",
        "creativeType",
        "fromLines",
        "subjectLines",
      ];

      const touchedFields: Record<string, boolean> = {};
      allFields.forEach((field) => {
        touchedFields[field] = true;
      });

      const isValid = Object.keys(errors).length === 0;

      setValidationState((prev) => ({
        ...prev,
        errors,
        isValid,
        touched: { ...prev.touched, ...touchedFields },
      }));

      return {
        valid: isValid,
        errors,
      };
    },
    [keepValidation]
  );

  const clearErrors = useCallback(() => {
    setValidationState((prev) => ({
      ...prev,
      errors: {},
      isValid: false,
    }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setValidationState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName]: "",
      },
    }));
  }, []);

  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      if (!keepValidation) {
        return false;
      }
      return !!validationState.errors[fieldName];
    },
    [validationState.errors, keepValidation]
  );

  const getFieldErrorMessage = useCallback(
    (fieldName: string): string => {
      if (!keepValidation) {
        return "";
      }
      return validationState.errors[fieldName] || "";
    },
    [validationState.errors, keepValidation]
  );

  const isFieldTouched = useCallback(
    (fieldName: string): boolean => {
      return !!validationState.touched[fieldName];
    },
    [validationState.touched]
  );

  const isFormValid = useCallback((): boolean => {
    if (!keepValidation) {
      return true;
    }
    return validationState.isValid;
  }, [validationState.isValid, keepValidation]);

  const updateFileUploadState = useCallback((hasFiles: boolean) => {
    setHasUploadedFiles(hasFiles);
  }, []);
  const updateFromSubjectLinesState = useCallback((hasLines: boolean) => {
    setHasFromSubjectLines(hasLines);
  }, []);

  const validateAllFields = useCallback(
    (formData: PublisherFormData, hasFiles: boolean, hasLines: boolean) => {
      const result = validateCompleteFormData(formData, hasFiles, hasLines);
      return result;
    },
    [validateCompleteFormData]
  );

  const resetForm = useCallback(() => {
    setValidationState({
      errors: {},
      touched: {},
      isValid: false,
    });
    setHasUploadedFiles(false);
    setHasFromSubjectLines(false);
  }, []);

  const hasErrors = Object.keys(validationState.errors).some(
    (key) => validationState.errors[key]
  );
  const validateFormMethod = useCallback(
    (data: Partial<PublisherFormData>) => {
      if (!keepValidation) {
        return true;
      }
      const formDataObj: PublisherFormData = {
        affiliateId: data.affiliateId || "",
        companyName: data.companyName || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        telegramId: data.telegramId || "",
        offerId: data.offerId || "",
        creativeType: data.creativeType || "",
        additionalNotes: data.additionalNotes || "",
        fromLines: data.fromLines || "",
        subjectLines: data.subjectLines || "",
        priority: data.priority || "medium",
      };
      const result = validateCompleteFormData(
        formDataObj,
        hasUploadedFiles,
        hasFromSubjectLines
      );
      return result.valid;
    },
    [
      validateCompleteFormData,
      hasUploadedFiles,
      hasFromSubjectLines,
      keepValidation,
    ]
  );

  return useMemo(
    () => ({
      errors: validationState.errors,
      hasErrors,
      isValid: validationState.isValid,
      hasUploadedFiles,
      hasFromSubjectLines,

      validateField: validateSingleField,
      validateForm: validateFormMethod,
      clearErrors,
      handleFieldChange,
      handleFieldBlur,
      getFieldErrorMessage,
      hasFieldError,
      isFieldTouched,
      markFieldAsTouched,

      validatePersonalDetailsStep,
      validateContactDetailsStep,
      validateCreativeDetailsStep,
      validateCompleteFormData,
      validationState,
      updateFormData,
      validateAllFields,
      clearFieldError,
      isFormValid,
      updateFileUploadState,
      updateFromSubjectLinesState,
      resetForm,
    }),
    [
      validationState,
      hasErrors,
      hasUploadedFiles,
      hasFromSubjectLines,
      validateSingleField,
      validateFormMethod,
      clearErrors,
      handleFieldChange,
      handleFieldBlur,
      getFieldErrorMessage,
      hasFieldError,
      isFieldTouched,
      markFieldAsTouched,
      validatePersonalDetailsStep,
      validateContactDetailsStep,
      validateCreativeDetailsStep,
      validateCompleteFormData,
      updateFormData,
      validateAllFields,
      clearFieldError,
      isFormValid,
      updateFileUploadState,
      updateFromSubjectLinesState,
      resetForm,
    ]
  );
};
