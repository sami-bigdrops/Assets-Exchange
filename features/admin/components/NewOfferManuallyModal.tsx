"use client";

import { Upload, File, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useNewOfferManuallyViewModel,
  type NewOfferFormData,
} from "../view-models/useNewOfferManuallyViewModel";

interface NewOfferManuallyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (offerId: string) => void;
}

export function NewOfferManuallyModal({
  open,
  onOpenChange,
  onSuccess,
}: NewOfferManuallyModalProps) {
  const variables = getVariables();
  const inputRingColor = variables.colors.inputRingColor;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isSubmitting, error, submitOffer, reset } =
    useNewOfferManuallyViewModel();

  const [formData, setFormData] = useState<NewOfferFormData>({
    offerId: "",
    offerName: "",
    advertiserId: "",
    advertiserName: "",
    status: "Active",
    visibility: "Public",
    brandGuidelinesType: "url",
    brandGuidelinesUrl: "",
    brandGuidelinesFile: null,
    brandGuidelinesText: "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof NewOfferFormData, string>>
  >({});

  useEffect(() => {
    if (open) {
      reset();
      setFormData({
        offerId: "",
        offerName: "",
        advertiserId: "",
        advertiserName: "",
        status: "Active",
        visibility: "Public",
        brandGuidelinesType: "url",
        brandGuidelinesUrl: "",
        brandGuidelinesFile: null,
        brandGuidelinesText: "",
      });
      setValidationErrors({});
    }
  }, [open, reset]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewOfferFormData, string>> = {};

    if (!formData.offerId.trim()) {
      errors.offerId = "Offer ID is required";
    }

    if (!formData.offerName.trim()) {
      errors.offerName = "Offer name is required";
    }

    if (!formData.advertiserId.trim()) {
      errors.advertiserId = "Advertiser ID is required";
    }

    if (!formData.advertiserName.trim()) {
      errors.advertiserName = "Advertiser name is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const createdOffer = await submitOffer(formData);

    if (createdOffer) {
      onSuccess?.(createdOffer.id);
      onOpenChange(false);
    }
  };

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isSubmitting && !open) {
        onOpenChange(false);
      }
    },
    [isSubmitting, onOpenChange]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  }, [isSubmitting, onOpenChange]);

  const updateFormField = <K extends keyof NewOfferFormData>(
    field: K,
    value: NewOfferFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .offer-modal-input:focus-visible {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
          .offer-modal-input:-webkit-autofill,
          .offer-modal-input:-webkit-autofill:hover,
          .offer-modal-input:-webkit-autofill:focus,
          .offer-modal-input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
            box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            background-color: ${variables.colors.inputBackgroundColor} !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .offer-modal-input::selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .offer-modal-input::-moz-selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .offer-modal-select:focus-visible {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
          .offer-modal-rich-text-editor:focus-within {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
          .offer-modal-rich-text-editor [contenteditable]:focus {
            outline: none !important;
          }
          .offer-modal-rich-text-editor [contenteditable][data-placeholder]:empty:before {
            color: ${variables.colors.inputPlaceholderColor} !important;
          }
        `,
        }}
      />
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-w-0">
          <DialogHeader
            className="-mt-1 -mx-1 mb-0 px-8 py-6 overflow-hidden"
            style={{
              backgroundColor: variables.colors.cardHeaderBackgroundColor,
            }}
          >
            <DialogTitle
              className="xl:text-lg text-sm lg:text-base font-inter font-semibold"
              style={{ color: variables.colors.cardHeaderTextColor }}
            >
              Create New Offer Manually
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="min-w-0">
            <div className="space-y-4 w-full">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offerId" className="font-inter text-sm">
                    Offer ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="offerId"
                    value={formData.offerId}
                    onChange={(e) => updateFormField("offerId", e.target.value)}
                    placeholder="Enter offer ID"
                    disabled={isSubmitting}
                    aria-invalid={!!validationErrors.offerId}
                    className="h-12 font-inter offer-modal-input"
                    style={{
                      backgroundColor: variables.colors.inputBackgroundColor,
                      borderColor: variables.colors.inputBorderColor,
                      color: variables.colors.inputTextColor,
                    }}
                  />
                  {validationErrors.offerId && (
                    <p className="text-sm text-destructive font-inter">
                      {validationErrors.offerId}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="font-inter text-sm">
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "Active" | "Inactive") =>
                      updateFormField("status", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="status"
                      className="w-full h-12! font-inter offer-modal-select"
                      style={{
                        backgroundColor: variables.colors.inputBackgroundColor,
                        borderColor: variables.colors.inputBorderColor,
                        color: variables.colors.inputTextColor,
                        height: "3rem",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offerName" className="font-inter text-sm">
                  Offer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="offerName"
                  value={formData.offerName}
                  onChange={(e) => updateFormField("offerName", e.target.value)}
                  placeholder="Enter offer name"
                  disabled={isSubmitting}
                  aria-invalid={!!validationErrors.offerName}
                  className="h-12 font-inter offer-modal-input"
                  style={{
                    backgroundColor: variables.colors.inputBackgroundColor,
                    borderColor: variables.colors.inputBorderColor,
                    color: variables.colors.inputTextColor,
                  }}
                />
                {validationErrors.offerName && (
                  <p className="text-sm text-destructive font-inter">
                    {validationErrors.offerName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advertiserId" className="font-inter text-sm">
                    Advertiser ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="advertiserId"
                    value={formData.advertiserId}
                    onChange={(e) =>
                      updateFormField("advertiserId", e.target.value)
                    }
                    placeholder="Enter advertiser ID"
                    disabled={isSubmitting}
                    aria-invalid={!!validationErrors.advertiserId}
                    className="h-12 font-inter offer-modal-input"
                    style={{
                      backgroundColor: variables.colors.inputBackgroundColor,
                      borderColor: variables.colors.inputBorderColor,
                      color: variables.colors.inputTextColor,
                    }}
                  />
                  {validationErrors.advertiserId && (
                    <p className="text-sm text-destructive font-inter">
                      {validationErrors.advertiserId}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visibility" className="font-inter text-sm">
                    Visibility
                  </Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value: "Public" | "Internal" | "Hidden") =>
                      updateFormField("visibility", value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="visibility"
                      className="w-full h-12! font-inter offer-modal-select"
                      style={{
                        backgroundColor: variables.colors.inputBackgroundColor,
                        borderColor: variables.colors.inputBorderColor,
                        color: variables.colors.inputTextColor,
                        height: "3rem",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Internal">Internal</SelectItem>
                      <SelectItem value="Hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="advertiserName" className="font-inter text-sm">
                  Advertiser Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="advertiserName"
                  value={formData.advertiserName}
                  onChange={(e) =>
                    updateFormField("advertiserName", e.target.value)
                  }
                  placeholder="Enter advertiser name"
                  disabled={isSubmitting}
                  aria-invalid={!!validationErrors.advertiserName}
                  className="h-12 font-inter offer-modal-input"
                  style={{
                    backgroundColor: variables.colors.inputBackgroundColor,
                    borderColor: variables.colors.inputBorderColor,
                    color: variables.colors.inputTextColor,
                  }}
                />
                {validationErrors.advertiserName && (
                  <p className="text-sm text-destructive font-inter">
                    {validationErrors.advertiserName}
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-2 border-t">
                <Label className="font-inter text-sm font-semibold">
                  Brand Guidelines
                </Label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={
                        formData.brandGuidelinesType === "url"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateFormField("brandGuidelinesType", "url")
                      }
                      disabled={isSubmitting}
                      className="font-inter text-sm h-9!"
                      style={
                        formData.brandGuidelinesType === "url"
                          ? {
                              backgroundColor:
                                variables.colors.buttonDefaultBackgroundColor,
                              color: variables.colors.buttonDefaultTextColor,
                              height: "2.25rem",
                            }
                          : {
                              backgroundColor:
                                variables.colors.buttonOutlineBackgroundColor,
                              borderColor:
                                variables.colors.buttonOutlineBorderColor,
                              color: variables.colors.buttonOutlineTextColor,
                              height: "2.25rem",
                            }
                      }
                    >
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={
                        formData.brandGuidelinesType === "upload"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateFormField("brandGuidelinesType", "upload")
                      }
                      disabled={isSubmitting}
                      className="font-inter text-sm h-9!"
                      style={
                        formData.brandGuidelinesType === "upload"
                          ? {
                              backgroundColor:
                                variables.colors.buttonDefaultBackgroundColor,
                              color: variables.colors.buttonDefaultTextColor,
                              height: "2.25rem",
                            }
                          : {
                              backgroundColor:
                                variables.colors.buttonOutlineBackgroundColor,
                              borderColor:
                                variables.colors.buttonOutlineBorderColor,
                              color: variables.colors.buttonOutlineTextColor,
                              height: "2.25rem",
                            }
                      }
                    >
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant={
                        formData.brandGuidelinesType === "text"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateFormField("brandGuidelinesType", "text")
                      }
                      disabled={isSubmitting}
                      className="font-inter text-sm h-9!"
                      style={
                        formData.brandGuidelinesType === "text"
                          ? {
                              backgroundColor:
                                variables.colors.buttonDefaultBackgroundColor,
                              color: variables.colors.buttonDefaultTextColor,
                              height: "2.25rem",
                            }
                          : {
                              backgroundColor:
                                variables.colors.buttonOutlineBackgroundColor,
                              borderColor:
                                variables.colors.buttonOutlineBorderColor,
                              color: variables.colors.buttonOutlineTextColor,
                              height: "2.25rem",
                            }
                      }
                    >
                      Direct Input
                    </Button>
                  </div>

                  {formData.brandGuidelinesType === "url" && (
                    <div className="space-y-2">
                      <Input
                        id="brandGuidelinesUrl"
                        type="text"
                        value={formData.brandGuidelinesUrl || ""}
                        onChange={(e) => {
                          let value = e.target.value;
                          const httpsPrefix = "https://";

                          if (value.length === 0) {
                            value = httpsPrefix;
                          } else if (value.startsWith(httpsPrefix)) {
                            value = value;
                          } else if (value.startsWith("http://")) {
                            value = httpsPrefix + value.replace("http://", "");
                          } else if (
                            value.length < httpsPrefix.length &&
                            (value === "https:/" ||
                              value === "https:" ||
                              value === "https" ||
                              value === "http" ||
                              value === "http:" ||
                              value === "http:/")
                          ) {
                            value = httpsPrefix;
                          } else if (!value.startsWith("http")) {
                            value = httpsPrefix + value;
                          }
                          updateFormField("brandGuidelinesUrl", value);
                        }}
                        onFocus={(e) => {
                          const input = e.currentTarget;
                          if (!input.value.startsWith("https://")) {
                            const newValue = "https://";
                            updateFormField("brandGuidelinesUrl", newValue);
                            setTimeout(() => {
                              input.setSelectionRange(
                                newValue.length,
                                newValue.length
                              );
                            }, 0);
                          }
                        }}
                        onKeyDown={(e) => {
                          const input = e.currentTarget;
                          const cursorPos = input.selectionStart || 0;
                          const selectionEnd = input.selectionEnd || 0;
                          const httpsLength = 8;

                          if (e.key === "Backspace") {
                            if (
                              cursorPos <= httpsLength &&
                              selectionEnd <= httpsLength
                            ) {
                              e.preventDefault();
                              return;
                            }
                            if (
                              cursorPos === httpsLength &&
                              selectionEnd === httpsLength
                            ) {
                              e.preventDefault();
                              return;
                            }
                          }

                          if (e.key === "Delete") {
                            if (cursorPos < httpsLength) {
                              e.preventDefault();
                              return;
                            }
                          }

                          if (
                            e.key === "ArrowLeft" &&
                            cursorPos <= httpsLength
                          ) {
                            e.preventDefault();
                            input.setSelectionRange(httpsLength, httpsLength);
                            return;
                          }

                          if (e.key === "Home") {
                            e.preventDefault();
                            input.setSelectionRange(httpsLength, httpsLength);
                            return;
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData("text");
                          let cleanText = pastedText;
                          if (pastedText.startsWith("https://")) {
                            cleanText = pastedText.replace("https://", "");
                          } else if (pastedText.startsWith("http://")) {
                            cleanText = pastedText.replace("http://", "");
                          }
                          const input = e.currentTarget;
                          const start = Math.max(input.selectionStart || 0, 8);
                          const end = Math.max(input.selectionEnd || 0, 8);
                          const currentValue =
                            formData.brandGuidelinesUrl || "https://";
                          const baseUrl = currentValue.substring(0, 8);
                          const newValue =
                            baseUrl +
                            currentValue.slice(8, start) +
                            cleanText +
                            currentValue.slice(end);
                          updateFormField("brandGuidelinesUrl", newValue);
                          setTimeout(() => {
                            const newCursorPos = start + cleanText.length;
                            input.setSelectionRange(newCursorPos, newCursorPos);
                          }, 0);
                        }}
                        placeholder="Enter brand guideline url"
                        disabled={isSubmitting}
                        className="h-12 font-inter offer-modal-input"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: variables.colors.inputBorderColor,
                          color: variables.colors.inputTextColor,
                        }}
                      />
                    </div>
                  )}

                  {formData.brandGuidelinesType === "upload" && (
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        id="brandGuidelinesFile"
                        type="file"
                        accept=".doc,.docx,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateFormField("brandGuidelinesFile", file);
                        }}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                      {!formData.brandGuidelinesFile ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              fileInputRef.current?.click();
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label="Upload file"
                          className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all focus-visible:outline-none"
                          style={{
                            borderColor: variables.colors.inputBorderColor,
                            backgroundColor:
                              variables.colors.inputBackgroundColor,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = inputRingColor;
                            e.currentTarget.style.backgroundColor =
                              variables.colors.inputBackgroundColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor =
                              variables.colors.inputBorderColor;
                            e.currentTarget.style.backgroundColor =
                              variables.colors.inputBackgroundColor;
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = inputRingColor;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${inputRingColor}50`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              variables.colors.inputBorderColor;
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload
                              className="mb-2"
                              style={{ color: variables.colors.inputTextColor }}
                              size={24}
                            />
                            <p
                              className="mb-2 text-sm font-inter"
                              style={{ color: variables.colors.inputTextColor }}
                            >
                              <span className="font-semibold">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </p>
                            <p
                              className="text-xs font-inter"
                              style={{
                                color: variables.colors.inputPlaceholderColor,
                              }}
                            >
                              DOCX, PDF (MAX. 10MB)
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-between w-full h-12 px-4 rounded-lg border"
                          style={{
                            borderColor: variables.colors.inputBorderColor,
                            backgroundColor:
                              variables.colors.inputBackgroundColor,
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <File
                              size={20}
                              style={{ color: variables.colors.inputTextColor }}
                              className="shrink-0"
                            />
                            <span
                              className="text-sm font-inter truncate"
                              style={{ color: variables.colors.inputTextColor }}
                              title={formData.brandGuidelinesFile.name}
                            >
                              {formData.brandGuidelinesFile.name}
                            </span>
                            <span
                              className="text-xs font-inter ml-auto shrink-0"
                              style={{
                                color: variables.colors.inputPlaceholderColor,
                              }}
                            >
                              {(
                                formData.brandGuidelinesFile.size /
                                1024 /
                                1024
                              ).toFixed(2)}{" "}
                              MB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateFormField("brandGuidelinesFile", null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                            disabled={isSubmitting}
                            className="ml-2 p-1 rounded hover:bg-opacity-10 transition-colors shrink-0"
                            style={{
                              color: variables.colors.inputTextColor,
                            }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.brandGuidelinesType === "text" && (
                    <div className="space-y-2">
                      <RichTextEditor
                        value={formData.brandGuidelinesText || ""}
                        onChange={(value) =>
                          updateFormField("brandGuidelinesText", value)
                        }
                        placeholder="Enter brand guidelines text..."
                        disabled={isSubmitting}
                        className="font-inter offer-modal-rich-text-editor"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: variables.colors.inputBorderColor,
                          color: variables.colors.inputTextColor,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <DialogClose asChild className="w-full sm:w-auto min-w-0 shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleClose}
                className="w-full flex-1 h-12! font-inter font-medium"
                style={{
                  backgroundColor:
                    variables.colors.buttonOutlineBackgroundColor,
                  borderColor: variables.colors.buttonOutlineBorderColor,
                  color: variables.colors.buttonOutlineTextColor,
                  height: "3rem",
                }}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex-1 h-12! font-inter font-medium shrink-0"
              style={{
                backgroundColor: isSubmitting
                  ? variables.colors.buttonDisabledBackgroundColor
                  : variables.colors.buttonDefaultBackgroundColor,
                color: isSubmitting
                  ? variables.colors.buttonDisabledTextColor
                  : variables.colors.buttonDefaultTextColor,
                height: "3rem",
              }}
            >
              {isSubmitting ? "Creating..." : "Create Offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
