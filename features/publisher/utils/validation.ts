import type { PublisherFormData } from "@/features/publisher/hooks/usePublisherForm";

import {
  ErrorType,
  createError,
  ERROR_MESSAGES,
  type AppError,
} from "./errorHandling";

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  error?: AppError;
}

// File validation result
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  if (!email || !email.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Telegram ID validation
export const isValidTelegramId = (telegramId: string): boolean => {
  if (!telegramId || telegramId.trim() === "" || telegramId === "@")
    return false;
  const trimmed = telegramId.trim();
  const telegramRegex = /^@[a-zA-Z0-9_]{5,32}$/;
  return telegramRegex.test(trimmed);
};

// Required field validation
export const isRequired = (value: string | undefined | null): boolean => {
  return value !== undefined && value !== null && value.trim().length > 0;
};

// Validate individual field
export const validateField = (
  fieldName: keyof PublisherFormData,
  value: string
): { valid: boolean; error?: string } => {
  switch (fieldName) {
    case "telegramId":
      if (!value || value.trim() === "" || value === "@") {
        return { valid: true };
      }
      if (!isValidTelegramId(value)) {
        return {
          valid: false,
          error: ERROR_MESSAGES.VALIDATION.INVALID_TELEGRAM_ID,
        };
      }
      return { valid: true };

    case "email":
      if (!isValidEmail(value)) {
        return {
          valid: false,
          error: ERROR_MESSAGES.VALIDATION.INVALID_EMAIL,
        };
      }
      break;

    case "affiliateId":
      if (value.trim().length < 2) {
        return {
          valid: false,
          error: "Affiliate ID must be at least 2 characters",
        };
      }
      if (!/^\d+$/.test(value.trim())) {
        return {
          valid: false,
          error: "Affiliate ID must contain only numbers",
        };
      }
      break;

    case "companyName":
      if (value.trim().length < 2) {
        return {
          valid: false,
          error: "Company name must be at least 2 characters",
        };
      }
      break;

    case "firstName":
      if (value.trim().length < 2) {
        return {
          valid: false,
          error: "First name must be at least 2 characters",
        };
      }
      break;

    case "lastName":
      if (value.trim().length < 2) {
        return {
          valid: false,
          error: "Last name must be at least 2 characters",
        };
      }
      break;

    case "offerId":
      if (!value || value.trim().length === 0) {
        return {
          valid: false,
          error: ERROR_MESSAGES.VALIDATION.INVALID_OFFER,
        };
      }
      break;

    case "creativeType":
      if (!value || value.trim().length === 0) {
        return {
          valid: false,
          error: "Please select a creative type",
        };
      }
      break;

      break;
  }

  return { valid: true };
};

// Validate step 1 (Personal Details)
export const validatePersonalDetails = (
  formData: Partial<PublisherFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  const fields: Array<keyof PublisherFormData> = [
    "affiliateId",
    "companyName",
    "firstName",
    "lastName",
  ];

  fields.forEach((field) => {
    const validation = validateField(field, formData[field] || "");
    if (!validation.valid && validation.error) {
      errors[field] = validation.error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// Validate step 2 (Contact Details)
export const validateContactDetails = (
  formData: Partial<PublisherFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  const emailValidation = validateField("email", formData.email || "");
  if (!emailValidation.valid && emailValidation.error) {
    errors.email = emailValidation.error;
  }

  const telegramId = formData.telegramId || "";
  if (telegramId && telegramId.trim() !== "" && telegramId !== "@") {
    const telegramValidation = validateField("telegramId", telegramId);
    if (!telegramValidation.valid && telegramValidation.error) {
      errors.telegramId = telegramValidation.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// Validate step 3 (Creative Details)
export const validateCreativeDetails = (
  formData: Partial<PublisherFormData>
): ValidationResult => {
  const errors: Record<string, string> = {};

  const offerValidation = validateField("offerId", formData.offerId || "");
  if (!offerValidation.valid && offerValidation.error) {
    errors.offerId = offerValidation.error;
  }

  const creativeTypeValidation = validateField(
    "creativeType",
    formData.creativeType || ""
  );
  if (!creativeTypeValidation.valid && creativeTypeValidation.error) {
    errors.creativeType = creativeTypeValidation.error;
  }

  // const fromLinesValidation = validateField('fromLines', formData.fromLines || '');
  // if (!fromLinesValidation.valid && fromLinesValidation.error) {
  //   errors.fromLines = fromLinesValidation.error;
  // }

  // const subjectLinesValidation = validateField('subjectLines', formData.subjectLines || '');
  // if (!subjectLinesValidation.valid && subjectLinesValidation.error) {
  //   errors.subjectLines = subjectLinesValidation.error;
  // }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// Validate entire form
export const validateForm = (formData: PublisherFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  // Validate all required fields
  const personalValidation = validatePersonalDetails(formData);
  const contactValidation = validateContactDetails(formData);
  const creativeValidation = validateCreativeDetails(formData);

  Object.assign(errors, personalValidation.errors);
  Object.assign(errors, contactValidation.errors);
  Object.assign(errors, creativeValidation.errors);

  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      errors,
      error: createError(
        ErrorType.VALIDATION,
        "Please fix the validation errors before submitting",
        "FORM_VALIDATION_FAILED",
        errors
      ),
    };
  }

  return {
    valid: true,
    errors: {},
  };
};

// File validation
export const validateFile = (file: File): FileValidationResult => {
  // Maximum file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  // Allowed file types
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (!file) {
    return {
      valid: false,
      error: "No file selected",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: ERROR_MESSAGES.VALIDATION.FILE_TOO_LARGE,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: ERROR_MESSAGES.VALIDATION.INVALID_FILE_TYPE,
    };
  }

  return {
    valid: true,
  };
};

// Validate from lines and subject lines
// export const validateFromSubjectLines = (
//   fromLines: string,
//   subjectLines: string
// ): ValidationResult => {
//   const errors: Record<string, string> = {};

//   if (!fromLines || !fromLines.trim()) {
//     errors.fromLines = 'From lines are required';
//   }

//   if (!subjectLines || !subjectLines.trim()) {
//     errors.subjectLines = 'Subject lines are required';
//   }

//   if (Object.keys(errors).length > 0) {
//     return {
//       valid: false,
//       errors,
//       error: createError(
//         ErrorType.VALIDATION,
//         'From lines and subject lines are required',
//         'FROM_SUBJECT_LINES_REQUIRED',
//         errors
//       )
//     };
//   }

//   return {
//     valid: true,
//     errors: {}
//   };
// }

// Get line count helper
export const getLineCount = (text: string): number => {
  if (!text || !text.trim()) return 0;
  return text
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
};
