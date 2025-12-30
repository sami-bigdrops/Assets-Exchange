"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getVariables } from "@/components/_variables/variables";
import { usePublisherForm } from "@/features/publisher/hooks/usePublisherForm";
import {
  renderStep,
  getStepLabel,
  getButtonText,
} from "@/features/publisher/view-models/publisherForm.viewModel";
import { Separator } from "@/components/ui/separator";

export default function PublisherForm() {
  const variables = getVariables();
  const { currentStep, formData, onDataChange, nextStep, previousStep, isSubmitting, handleSubmit } = usePublisherForm();
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
          </CardHeader>
          <CardContent>
            {renderStep({ step: currentStep, formData, onDataChange })}
          </CardContent>
          <CardFooter className="flex flex-col justify-between gap-4 w-full">
            {currentStep > 1 && (
              <Button
                variant="outline"
                className="w-full h-14 font-inter font-medium"
                onClick={previousStep}
                style={{
                  backgroundColor: variables.colors.buttonOutlineBackgroundColor,
                  borderColor: variables.colors.buttonOutlineBorderColor,
                  color: variables.colors.buttonOutlineTextColor,
                }}
              >
                {getButtonText(currentStep).prev}
              </Button>
            )}
            <Button
              className="w-full h-14 font-inter font-medium"
              onClick={currentStep === 3 ? handleSubmit : nextStep}
              disabled={isSubmitting}
              style={{
                backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                color: variables.colors.buttonDefaultTextColor,
              }}
            >
              {isSubmitting ? "Submitting..." : getButtonText(currentStep).next}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
