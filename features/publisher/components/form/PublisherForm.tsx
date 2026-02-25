"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
import { sanitizePlainText } from "@/lib/security/sanitize";

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
    currentCreativeFilesRef,
  } = usePublisherForm(requestId ?? null);

  /* Hydration Mismatch Fix:
   * The currentStep comes from localStorage via usePublisherForm -> loadFormState.
   * On the server, this is always 1 (default). On the client, it might be 3 (restored).
   * We must wait until mounted to show the real step to avoid 1 vs 3 mismatch.
   */
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During SSR/Hydration, render step 1 (default). After mount, render real step.
  const displayStep = isMounted ? currentStep : 1;

  const validation = useFormValidation(formData);
  const inputRingColor = variables.colors.inputRingColor;

  const handleNextOrSubmit = async () => {
    try {
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
          toast.error(
            "Please ensure all required fields are filled correctly."
          );
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else if (currentStep === 1) {
        const result = validation.validatePersonalDetailsStep(formData);
        if (!result.valid) return;
        nextStep();
      } else if (currentStep === 2) {
        const result = validation.validateContactDetailsStep(formData);
        if (!result.valid) return;
        nextStep();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    }
  };

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
              Step {displayStep} of 3 : {getStepLabel(displayStep)}
            </p>
            <Separator />
            {editData?.adminComments && (
              <Alert
                variant="destructive"
                className="mt-2 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100"
              >
                <AlertTitle>Feedback from reviewer</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap mt-1">
                  {sanitizePlainText(editData.adminComments)}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            {renderStep({
              step: currentStep,
              formData,
              creativeFilesRef: currentCreativeFilesRef,
              onDataChange,
              validation,
              editData,
              onNextOrSubmit: handleNextOrSubmit,
            })}
          </CardContent>
          <CardFooter className="flex flex-col justify-between gap-4 w-full">
            {currentStep > 1 && (
              <Button
                type="button"
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
              type="button"
              className="w-full h-14 font-inter font-medium"
              onClick={handleNextOrSubmit}
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
