"use client";

import { Loader2, Pencil, Check, X as XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getAdvertiserById,
  updateAdvertiser,
} from "../services/advertiser.service";
import type { Advertiser } from "../types/admin.types";

interface AdvertiserDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advertiserId: string | null;
  onSuccess?: () => void;
}

interface EditAdvertiserFormData {
  advertiserId: string;
  advertiserName: string;
  status: "Active" | "Inactive";
  advPlatform: string;
}

export function AdvertiserDetailsModal({
  open,
  onOpenChange,
  advertiserId,
  onSuccess,
}: AdvertiserDetailsModalProps) {
  const variables = getVariables();
  const inputRingColor = variables.colors.inputRingColor;

  const isApiSource = (createdMethod: string) => {
    return createdMethod?.toLowerCase() === "api";
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [isEditingAdvertiserId, setIsEditingAdvertiserId] = useState(false);
  const [isEditingAdvertiserName, setIsEditingAdvertiserName] = useState(false);

  const [formData, setFormData] = useState<EditAdvertiserFormData>({
    advertiserId: "",
    advertiserName: "",
    status: "Active",
    advPlatform: "Everflow",
  });

  const [initialFormData, setInitialFormData] =
    useState<EditAdvertiserFormData | null>(null);

  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof EditAdvertiserFormData, string>>
  >({});

  const hasUnsavedChanges = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  /**
   * TODO: BACKEND - Fetch Advertiser Details
   *
   * Currently uses getAdvertiserById service which should call:
   * GET /api/admin/advertisers/:id
   *
   * Backend should return:
   * {
   *   id: string,
   *   advertiserName: string,
   *   advPlatform: string,
   *   createdMethod: "Manually" | "API",
   *   status: "Active" | "Inactive",
   *   createdAt: string,              // ISO timestamp
   *   updatedAt: string,               // ISO timestamp
   *   createdBy?: string,              // User ID who created
   *   updatedBy?: string              // User ID who last updated
   * }
   *
   * Error Handling:
   * - 404: Advertiser not found - show error message
   * - 401: Unauthorized - redirect to login
   * - 403: Forbidden - show permission denied
   * - 500: Server error - show error with retry option
   */
  useEffect(() => {
    if (open && advertiserId) {
      const fetchAdvertiser = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const fetchedAdvertiser = await getAdvertiserById(advertiserId);
          if (fetchedAdvertiser) {
            setAdvertiser(fetchedAdvertiser);
            const initialData = {
              advertiserId: fetchedAdvertiser.id,
              advertiserName: fetchedAdvertiser.advertiserName,
              status: fetchedAdvertiser.status,
              advPlatform: fetchedAdvertiser.advPlatform,
            };
            setFormData(initialData);
            setInitialFormData(initialData);
            setIsEditingAdvertiserId(false);
            setIsEditingAdvertiserName(false);
          } else {
            setError("Advertiser not found");
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load advertiser details"
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchAdvertiser();
    }
  }, [open, advertiserId]);

  /**
   * TODO: BACKEND - Form Validation
   *
   * Current validation is client-side only. Backend should also validate:
   *
   * 1. Advertiser ID (if manually created):
   *    - Required if createdMethod is "Manually"
   *    - Format validation: M#### (M followed by exactly 4 digits)
   *    - Uniqueness check if ID is being changed
   *
   * 2. Advertiser Name (if manually created):
   *    - Required if createdMethod is "Manually"
   *    - Max length validation
   *    - Character restrictions
   *
   * 3. Platform:
   *    - Required, must be "Everflow"
   *    - Validate against allowed platform values
   *
   * 4. Status (if manually created):
   *    - Must be "Active" or "Inactive"
   *    - Only editable if createdMethod is "Manually"
   *
   * Return field-specific errors for better UX:
   * {
   *   field: string,
   *   message: string
   * }[]
   */
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof EditAdvertiserFormData, string>> = {};

    if (advertiser && !isApiSource(advertiser.createdMethod)) {
      if (!formData.advertiserId.trim()) {
        errors.advertiserId = "Advertiser ID is required";
      }
      if (!formData.advertiserName.trim()) {
        errors.advertiserName = "Advertiser name is required";
      }
    }

    if (!formData.advPlatform.trim()) {
      errors.advPlatform = "Platform is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * TODO: BACKEND - Implement Advertiser Update
   *
   * This function handles updating advertiser details.
   *
   * Endpoint: PUT /api/admin/advertisers/:id
   *
   * Request Body:
   * {
   *   advertiserId?: string,                // Only if advertiser was created manually
   *   advertiserName?: string,                // Only if advertiser was created manually
   *   status?: "Active" | "Inactive",         // Only if advertiser was created manually
   *   advPlatform?: string
   * }
   *
   * Business Rules:
   * - Advertiser ID and Advertiser Name can only be updated if createdMethod is "Manually"
   * - Status can only be updated if createdMethod is "Manually"
   * - API-created advertisers: Only advPlatform can be updated
   * - Manually-created advertisers: All fields can be updated
   *
   * Response:
   * {
   *   id: string,
   *   advertiserName: string,
   *   advPlatform: string,
   *   createdMethod: "Manually" | "API",
   *   status: "Active" | "Inactive",
   *   updatedAt: string                     // ISO timestamp
   * }
   *
   * Error Handling:
   * - 400: Validation errors
   *   - Invalid advertiserId format (if provided)
   *   - Invalid status value (if provided)
   *   - Return field-specific errors
   *
   * - 401: Unauthorized - redirect to login
   * - 403: Forbidden - show permission denied
   * - 404: Advertiser not found
   * - 409: Conflict - advertiserId already exists (if changing advertiserId)
   * - 500: Server error - show error with retry option
   *
   * Success:
   * - Return updated advertiser object
   * - Show success notification
   * - Refresh advertisers list
   * - Close modal
   *
   * Audit Trail:
   * - Log all update actions
   * - Track which fields were changed
   * - Store previous values for rollback if needed
   * - Track who updated and when
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !advertiser) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // TODO: BACKEND - Include all form fields in update payload
      // TODO: Validate business rules (e.g., can't edit ID/Name/Status if API-created)
      // TODO: Handle optimistic updates and rollback on error

      const updatePayload: Partial<Advertiser> = {
        advPlatform: formData.advPlatform,
      };

      if (!isApiSource(advertiser.createdMethod)) {
        updatePayload.id = formData.advertiserId;
        updatePayload.advertiserName = formData.advertiserName;
        updatePayload.status = formData.status;
      }

      const updatedAdvertiser = await updateAdvertiser(
        advertiser.id,
        updatePayload
      );

      if (updatedAdvertiser) {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update advertiser"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (isSubmitting) {
        return;
      }

      if (!open && hasUnsavedChanges) {
        if (
          window.confirm(
            "You have unsaved changes. Are you sure you want to close?"
          )
        ) {
          setInitialFormData(null);
          onOpenChange(false);
        }
      } else if (!open) {
        onOpenChange(false);
      }
    },
    [isSubmitting, hasUnsavedChanges, onOpenChange]
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  }, [isSubmitting, onOpenChange]);

  const updateFormField = <K extends keyof EditAdvertiserFormData>(
    field: K,
    value: EditAdvertiserFormData[K]
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
          .edit-advertiser-modal-input:focus-visible {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
          .edit-advertiser-modal-input:-webkit-autofill,
          .edit-advertiser-modal-input:-webkit-autofill:hover,
          .edit-advertiser-modal-input:-webkit-autofill:focus,
          .edit-advertiser-modal-input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
            box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            background-color: ${variables.colors.inputBackgroundColor} !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .edit-advertiser-modal-input::selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .edit-advertiser-modal-input::-moz-selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .edit-advertiser-modal-select:focus-visible {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
        `,
        }}
      />
      <DialogContent
        className="max-w-4xl! w-full max-h-[90vh] m-0 rounded-lg p-0 overflow-hidden shadow-xl"
        showCloseButton={false}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-w-0">
          <DialogHeader
            className="px-6 py-5 border-b"
            style={{
              backgroundColor: variables.colors.cardHeaderBackgroundColor,
            }}
          >
            <DialogTitle
              className="text-lg font-semibold font-inter"
              style={{ color: variables.colors.cardHeaderTextColor }}
            >
              Advertiser Details
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
            {isLoading ? (
              <div className="space-y-8 w-full">
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
                <div className="border-t pt-6">
                  <div className="space-y-6">
                    <Skeleton className="h-5 w-32" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ) : error && !advertiser ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-destructive">{error}</div>
              </div>
            ) : advertiser ? (
              <div className="space-y-8 w-full">
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Advertiser ID
                      </Label>
                      <div className="min-h-10 flex items-center">
                        {!isApiSource(advertiser.createdMethod) &&
                        isEditingAdvertiserId ? (
                          <div className="flex items-center gap-2 w-full">
                            <Input
                              value={formData.advertiserId}
                              onChange={(e) =>
                                updateFormField("advertiserId", e.target.value)
                              }
                              disabled={isSubmitting}
                              className="h-10 font-inter edit-advertiser-modal-input flex-1 text-sm"
                              style={{
                                backgroundColor:
                                  variables.colors.inputBackgroundColor,
                                borderColor: variables.colors.inputBorderColor,
                                color: variables.colors.inputTextColor,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (advertiser) {
                                  updateFormField(
                                    "advertiserId",
                                    advertiser.id
                                  );
                                }
                                setIsEditingAdvertiserId(false);
                              }}
                              disabled={isSubmitting}
                              className="p-1.5 rounded-md transition-colors shrink-0 border"
                              style={{
                                backgroundColor: "#FEE2E2",
                                borderColor: "#EF4444",
                                color: "#EF4444",
                              }}
                            >
                              <XIcon size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingAdvertiserId(false)}
                              disabled={isSubmitting}
                              className="p-1.5 rounded-md transition-colors shrink-0 border"
                              style={{
                                backgroundColor: "#D1FAE5",
                                borderColor: "#10B981",
                                color: "#10B981",
                              }}
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="font-inter text-sm flex items-center gap-2 w-full min-h-10 px-3 py-2 rounded-md bg-muted/30">
                            <span className="flex-1 font-medium">
                              {advertiser.id}
                            </span>
                            {!isApiSource(advertiser.createdMethod) && (
                              <button
                                type="button"
                                onClick={() => setIsEditingAdvertiserId(true)}
                                disabled={isSubmitting}
                                className="p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 opacity-60 hover:opacity-100"
                                style={{
                                  color: variables.colors.inputTextColor,
                                }}
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {validationErrors.advertiserId && (
                        <p className="text-xs text-destructive font-inter mt-1">
                          {validationErrors.advertiserId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Status
                      </Label>
                      {!isApiSource(advertiser.createdMethod) ? (
                        <Select
                          value={formData.status}
                          onValueChange={(value: "Active" | "Inactive") =>
                            updateFormField("status", value)
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger
                            className="w-full h-10 font-inter edit-advertiser-modal-select text-sm"
                            style={{
                              backgroundColor:
                                variables.colors.inputBackgroundColor,
                              borderColor: variables.colors.inputBorderColor,
                              color: variables.colors.inputTextColor,
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="min-h-10 flex items-center">
                          <span
                            className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium border"
                            style={{
                              backgroundColor:
                                advertiser.status === "Active"
                                  ? variables.colors
                                      .approvedAssetsBackgroundColor
                                  : variables.colors
                                      .rejectedAssetsBackgroundColor,
                              borderColor:
                                advertiser.status === "Active"
                                  ? "#86EFAC"
                                  : "#FFC2A3",
                              color:
                                advertiser.status === "Active"
                                  ? variables.colors.approvedAssetsIconColor
                                  : variables.colors.rejectedAssetsIconColor,
                            }}
                          >
                            {advertiser.status}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Created Method
                      </Label>
                      <div className="font-inter text-sm flex items-center min-h-10 px-3 py-2 rounded-md bg-muted/30">
                        <span className="font-medium">
                          {advertiser.createdMethod}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Advertiser Name
                    </Label>
                    <div className="min-h-10 flex items-center">
                      {!isApiSource(advertiser.createdMethod) &&
                      isEditingAdvertiserName ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input
                            value={formData.advertiserName}
                            onChange={(e) =>
                              updateFormField("advertiserName", e.target.value)
                            }
                            disabled={isSubmitting}
                            className="h-10 font-inter edit-advertiser-modal-input flex-1 text-sm"
                            style={{
                              backgroundColor:
                                variables.colors.inputBackgroundColor,
                              borderColor: variables.colors.inputBorderColor,
                              color: variables.colors.inputTextColor,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (advertiser) {
                                updateFormField(
                                  "advertiserName",
                                  advertiser.advertiserName
                                );
                              }
                              setIsEditingAdvertiserName(false);
                            }}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-md transition-colors shrink-0 border"
                            style={{
                              backgroundColor: "#FEE2E2",
                              borderColor: "#EF4444",
                              color: "#EF4444",
                            }}
                          >
                            <XIcon size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingAdvertiserName(false)}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-md transition-colors shrink-0 border"
                            style={{
                              backgroundColor: "#D1FAE5",
                              borderColor: "#10B981",
                              color: "#10B981",
                            }}
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="font-inter text-sm flex items-center gap-2 w-full min-h-10 px-3 py-2 rounded-md bg-muted/30">
                          <span className="flex-1 font-medium">
                            {advertiser.advertiserName}
                          </span>
                          {!isApiSource(advertiser.createdMethod) && (
                            <button
                              type="button"
                              onClick={() => setIsEditingAdvertiserName(true)}
                              disabled={isSubmitting}
                              className="p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 opacity-60 hover:opacity-100"
                              style={{
                                color: variables.colors.inputTextColor,
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {validationErrors.advertiserName && (
                      <p className="text-xs text-destructive font-inter mt-1">
                        {validationErrors.advertiserName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="advPlatform"
                        className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide"
                      >
                        Platform <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.advPlatform}
                        onValueChange={(value) =>
                          updateFormField("advPlatform", value)
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="advPlatform"
                          className="w-full h-12! font-inter edit-advertiser-modal-select"
                          style={{
                            backgroundColor:
                              variables.colors.inputBackgroundColor,
                            borderColor: variables.colors.inputBorderColor,
                            color: variables.colors.inputTextColor,
                          }}
                        >
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Everflow">Everflow</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.advPlatform && (
                        <p className="text-sm text-destructive font-inter">
                          {validationErrors.advPlatform}
                        </p>
                      )}
                    </div>
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogBody>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4 px-8 py-6 pt-4 border-t">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleClose}
                className="w-full flex-1 h-12 font-inter text-sm"
                style={{
                  backgroundColor:
                    variables.colors.buttonOutlineBackgroundColor,
                  borderColor: variables.colors.buttonOutlineBorderColor,
                  color: variables.colors.buttonOutlineTextColor,
                }}
              >
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex-1 h-12 font-inter text-sm"
              style={{
                backgroundColor: isSubmitting
                  ? variables.colors.buttonDisabledBackgroundColor
                  : variables.colors.buttonDefaultBackgroundColor,
                color: isSubmitting
                  ? variables.colors.buttonDisabledTextColor
                  : variables.colors.buttonDefaultTextColor,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
