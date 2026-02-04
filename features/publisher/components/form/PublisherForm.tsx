"use client";

import { getVariables } from "@/components/_variables/variables";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useFormValidation } from "@/features/publisher/hooks/useFormValidation";
import { usePublisherForm } from "@/features/publisher/hooks/usePublisherForm";
import {
  renderStep,
  getStepLabel,
  getButtonText,
} from "@/features/publisher/view-models/publisherForm.viewModel";

interface PublisherFormProps {
  requestId?: string | null;
}

export default function PublisherForm({ requestId }: PublisherFormProps = {}) {
  const variables = getVariables();
  const {
    currentStep,
    formData,
    onDataChange,
    nextStep,
    previousStep,
    isSubmitting,
    handleSubmit,
    editData,
  } = usePublisherForm(requestId ?? null);

  const validation = useFormValidation(formData);
  const inputRingColor = variables.colors.inputRingColor;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                    .publisher-form-input:focus-visible {
                        outline: none !important;
                        border-color: ${inputRingColor} !important;
                        box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
                    }
                    .publisher-form-input:-webkit-autofill,
                    .publisher-form-input:-webkit-autofill:hover,
                    .publisher-form-input:-webkit-autofill:focus,
                    .publisher-form-input:-webkit-autofill:active {
                        -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
                        -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
                        box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
                        background-color: ${variables.colors.inputBackgroundColor} !important;
                        color: ${variables.colors.inputTextColor} !important;
                    }
                    .publisher-form-input::selection {
                        background-color: ${inputRingColor}40 !important;
                        color: ${variables.colors.inputTextColor} !important;
                    }
                    .publisher-form-input::-moz-selection {
                        background-color: ${inputRingColor}40 !important;
                        color: ${variables.colors.inputTextColor} !important;
                    }
                `,
        }}
      />
      <div className="w-full flex flex-col items-center justify-center pb-12">
        <Card
          className="w-full max-w-md lg:max-w-xl xl:max-w-3xl gap-6 xl:gap-8"
          style={{ backgroundColor: variables.colors.cardBackground }}
        >
          <CardHeader className="flex flex-col items-start justify-start gap-2 lg:gap-4">
            <CardTitle
              className="text-3xl lg:text-4xl font-bold font-inter text-left "
              style={{ color: variables.colors.titleColor }}
            >
              Submit Your Creatives For Approval
            </CardTitle>
            <CardDescription
              className="text-sm lg:text-base xl:text-lg font-inter text-left"
              style={{ color: variables.colors.descriptionColor }}
            >
              Upload your static images or HTML creatives with offer details to
              begin the approval process. Our team will review and notify you
              shortly.
            </CardDescription>
            <p
              className="text-base sm:text-lg font-semibold font-inter"
              style={{ color: variables.colors.titleColor }}
            >
              Step {currentStep} of 3 : {getStepLabel(currentStep)}
            </p>
            <Separator />
            {editData?.adminComments && (
              <Alert
                variant="destructive"
                className="mt-2 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100"
              >
                <AlertTitle>Feedback from reviewer</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap mt-1">
                  {editData.adminComments}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            {renderStep({
              step: currentStep,
              formData,
              onDataChange,
              validation,
              editData,
            })}
          </CardContent>
          <CardFooter className="flex flex-col justify-between gap-4 w-full">
            {currentStep > 1 && (
              <Button
                variant="outline"
                className="w-full h-14 font-inter font-medium"
                onClick={previousStep}
                style={{
                  backgroundColor:
                    variables.colors.buttonOutlineBackgroundColor,
                  borderColor: variables.colors.buttonOutlineBorderColor,
                  color: variables.colors.buttonOutlineTextColor,
                }}
              >
                {getButtonText(currentStep, !!editData).prev}
              </Button>
            )}
            <Button
              className="w-full h-14 font-inter font-medium"
              onClick={async () => {
                if (currentStep === 3) {
                  const result = validation.validateCompleteFormData(
                    formData,
                    validation.hasUploadedFiles,
                    validation.hasFromSubjectLines
                  );
                  if (result.valid) {
                    await handleSubmit();
                  } else {
                    validation.validateCreativeDetailsStep(
                      formData,
                      validation.hasUploadedFiles,
                      validation.hasFromSubjectLines
                    );
                  }
                } else {
                  let isValid = false;
                  if (currentStep === 1) {
                    const result =
                      validation.validatePersonalDetailsStep(formData);
                    isValid = result.valid;
                    if (!isValid) {
                      return;
                    }
                  } else if (currentStep === 2) {
                    const result =
                      validation.validateContactDetailsStep(formData);
                    isValid = result.valid;
                    if (!isValid) {
                      return;
                    }
                  }
                  if (isValid) {
                    nextStep();
                  }
                }
              }}
              disabled={isSubmitting}
              style={{
                backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                color: variables.colors.buttonDefaultTextColor,
              }}
            >
              {isSubmitting
                ? "Submitting..."
                : getButtonText(currentStep, !!editData).next}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
