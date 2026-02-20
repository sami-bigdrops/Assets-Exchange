"use client";

import { getVariables } from "@/components/_variables/variables";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type PersonalDetailProps } from "@/features/publisher/types/form.types";

const PersonalDetails: React.FC<PersonalDetailProps> = ({
  formData,
  onDataChange,
  validation,
  onNextOrSubmit,
}) => {
  const variables = getVariables();

  return (
    <>
      <div className="space-y-6 w-full">
        {/* Affiliate ID and Company Name - Single Column */}
        <div className="space-y-4 w-full">
          <div className="space-y-2">
            <Label htmlFor="affiliateId" className="font-inter text-sm">
              Affiliate ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="affiliateId"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={formData.affiliateId}
              onChange={(e) => {
                const raw = e.target.value;
                const numeric = raw.replace(/\D/g, "");
                onDataChange({ affiliateId: numeric });
                validation.handleFieldChange("affiliateId", numeric);
              }}
              onBlur={() => validation.handleFieldBlur("affiliateId")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onNextOrSubmit?.();
                }
              }}
              placeholder="Enter affiliate ID"
              className="w-full h-12 font-inter publisher-form-input"
              style={{
                borderColor:
                  validation.hasFieldError("affiliateId") &&
                  validation.isFieldTouched("affiliateId")
                    ? variables.colors.inputErrorColor
                    : variables.colors.inputBorderColor,
              }}
              aria-invalid={
                validation.hasFieldError("affiliateId") &&
                validation.isFieldTouched("affiliateId")
              }
              aria-describedby={
                validation.hasFieldError("affiliateId") &&
                validation.isFieldTouched("affiliateId")
                  ? "affiliateId-error"
                  : undefined
              }
            />
            {validation.hasFieldError("affiliateId") &&
              validation.isFieldTouched("affiliateId") && (
                <p
                  id="affiliateId-error"
                  role="alert"
                  className="text-xs font-inter mt-1.5 min-h-5"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {validation.getFieldErrorMessage("affiliateId")}
                </p>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName" className="font-inter text-sm">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => {
                onDataChange({ companyName: e.target.value });
                validation.handleFieldChange("companyName", e.target.value);
              }}
              onBlur={() => validation.handleFieldBlur("companyName")}
              placeholder="Enter company name"
              className="h-12 font-inter publisher-form-input"
              style={{
                borderColor:
                  validation.hasFieldError("companyName") &&
                  validation.isFieldTouched("companyName")
                    ? variables.colors.inputErrorColor
                    : variables.colors.inputBorderColor,
              }}
              aria-invalid={
                validation.hasFieldError("companyName") &&
                validation.isFieldTouched("companyName")
              }
              aria-describedby={
                validation.hasFieldError("companyName") &&
                validation.isFieldTouched("companyName")
                  ? "companyName-error"
                  : undefined
              }
            />
            {validation.hasFieldError("companyName") &&
              validation.isFieldTouched("companyName") && (
                <p
                  id="companyName-error"
                  role="alert"
                  className="text-xs font-inter mt-1.5 min-h-5"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {validation.getFieldErrorMessage("companyName")}
                </p>
              )}
          </div>
        </div>

        {/* First Name and Last Name - Single Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="font-inter text-sm">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => {
                onDataChange({ firstName: e.target.value });
                validation.handleFieldChange("firstName", e.target.value);
              }}
              onBlur={() => validation.handleFieldBlur("firstName")}
              placeholder="Enter first name"
              className="h-12 font-inter publisher-form-input"
              style={{
                borderColor:
                  validation.hasFieldError("firstName") &&
                  validation.isFieldTouched("firstName")
                    ? variables.colors.inputErrorColor
                    : variables.colors.inputBorderColor,
              }}
              aria-invalid={
                validation.hasFieldError("firstName") &&
                validation.isFieldTouched("firstName")
              }
              aria-describedby={
                validation.hasFieldError("firstName") &&
                validation.isFieldTouched("firstName")
                  ? "firstName-error"
                  : undefined
              }
            />
            {validation.hasFieldError("firstName") &&
              validation.isFieldTouched("firstName") && (
                <p
                  id="firstName-error"
                  role="alert"
                  className="text-xs font-inter mt-1.5 min-h-5"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {validation.getFieldErrorMessage("firstName")}
                </p>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="font-inter text-sm">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => {
                onDataChange({ lastName: e.target.value });
                validation.handleFieldChange("lastName", e.target.value);
              }}
              onBlur={() => validation.handleFieldBlur("lastName")}
              placeholder="Enter last name"
              className="h-12 font-inter publisher-form-input"
              style={{
                borderColor:
                  validation.hasFieldError("lastName") &&
                  validation.isFieldTouched("lastName")
                    ? variables.colors.inputErrorColor
                    : variables.colors.inputBorderColor,
              }}
              aria-invalid={
                validation.hasFieldError("lastName") &&
                validation.isFieldTouched("lastName")
              }
              aria-describedby={
                validation.hasFieldError("lastName") &&
                validation.isFieldTouched("lastName")
                  ? "lastName-error"
                  : undefined
              }
            />
            {validation.hasFieldError("lastName") &&
              validation.isFieldTouched("lastName") && (
                <p
                  id="lastName-error"
                  role="alert"
                  className="text-xs font-inter mt-1.5 min-h-5"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {validation.getFieldErrorMessage("lastName")}
                </p>
              )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PersonalDetails;
