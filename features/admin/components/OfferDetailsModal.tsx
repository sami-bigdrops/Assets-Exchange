"use client";

import { Loader2, Pencil, Check, X as XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

import { getAllAdvertisers } from "../services/advertiser.service";
import { getOfferById, updateOffer } from "../services/offers.service";
import type { Advertiser, Offer } from "../types/admin.types";

interface EditDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string | null;
  onSuccess?: () => void;
}

interface EditOfferFormData {
  offerId: string;
  offerName: string;
  status: "Active" | "Inactive";
  visibility: "Public" | "Internal" | "Hidden";
  advertiserId: string;
  advertiserName: string;
}

export function EditDetailsModal({
  open,
  onOpenChange,
  offerId,
  onSuccess,
}: EditDetailsModalProps) {
  const variables = getVariables();
  const inputRingColor = variables.colors.inputRingColor;

  // Helper to check if source is API (case-insensitive)
  const isApiSource = (createdMethod: string) => {
    return createdMethod?.toLowerCase() === "api";
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isEditingOfferId, setIsEditingOfferId] = useState(false);
  const [isEditingOfferName, setIsEditingOfferName] = useState(false);

  const [formData, setFormData] = useState<EditOfferFormData>({
    offerId: "",
    offerName: "",
    status: "Active",
    visibility: "Public",
    advertiserId: "",
    advertiserName: "",
  });

  const [initialFormData, setInitialFormData] =
    useState<EditOfferFormData | null>(null);

  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof EditOfferFormData, string>>
  >({});

  const hasUnsavedChanges = useMemo(() => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [isLoadingAdvertisers, setIsLoadingAdvertisers] = useState(false);
  const [advertiserSearchQuery, setAdvertiserSearchQuery] = useState("");
  const [advertiserSelectOpen, setAdvertiserSelectOpen] = useState(false);

  const filteredAdvertisers = useMemo(() => {
    if (!advertiserSearchQuery.trim()) {
      return advertisers;
    }
    const query = advertiserSearchQuery.toLowerCase();
    return advertisers.filter(
      (advertiser) =>
        advertiser.id.toLowerCase().includes(query) ||
        advertiser.advertiserName.toLowerCase().includes(query)
    );
  }, [advertisers, advertiserSearchQuery]);

  useEffect(() => {
    const fetchAdvertisers = async () => {
      try {
        setIsLoadingAdvertisers(true);
        const data = await getAllAdvertisers();
        setAdvertisers(data);
      } catch (error) {
        console.error("Failed to fetch advertisers:", error);
        setAdvertisers([]);
      } finally {
        setIsLoadingAdvertisers(false);
      }
    };

    if (open) {
      fetchAdvertisers();
    }
  }, [open]);

  useEffect(() => {
    if (open && offerId) {
      const fetchOffer = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const fetchedOffer = await getOfferById(offerId);
          if (fetchedOffer) {
            setOffer(fetchedOffer);

            const advertiserList = await getAllAdvertisers();
            const matchedAdvertiser = advertiserList.find(
              (adv) => adv.advertiserName === fetchedOffer.advName
            );

            const initialData = {
              offerId: fetchedOffer.id,
              offerName: fetchedOffer.offerName,
              status: fetchedOffer.status,
              visibility: fetchedOffer.visibility,
              advertiserId: matchedAdvertiser?.id || "",
              advertiserName: fetchedOffer.advName,
            };
            setFormData(initialData);
            setInitialFormData(initialData);
            setIsEditingOfferId(false);
            setIsEditingOfferName(false);
          } else {
            setError("Offer not found");
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to load offer details"
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchOffer();
    } else {
      setAdvertiserSearchQuery("");
      setAdvertiserSelectOpen(false);
    }
  }, [open, offerId]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof EditOfferFormData, string>> = {};

    if (offer && !isApiSource(offer.createdMethod)) {
      if (!formData.offerId.trim()) {
        errors.offerId = "Offer ID is required";
      }
      if (!formData.offerName.trim()) {
        errors.offerName = "Offer name is required";
      }
    }

    if (offer && !isApiSource(offer.createdMethod)) {
      if (!formData.advertiserId.trim() || !formData.advertiserName.trim()) {
        errors.advertiserId = "Advertiser is required";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * TODO: BACKEND - Implement Offer Update
   *
   * This function handles updating offer details.
   *
   * Endpoint: PUT /api/admin/offers/:id
   *
   * Request Body:
   * {
   *   offerId?: string,                    // Only if offer was created manually
   *   offerName?: string,                   // Only if offer was created manually
   *   advertiserId?: string,
   *   advertiserName?: string,
   *   status?: "Active" | "Inactive",       // Only if offer was created manually
   *   visibility?: "Public" | "Internal" | "Hidden"
   * }
   *
   * Business Rules:
   * - Offer ID and Offer Name can only be updated if createdMethod is "Manually"
   * - Status can only be updated if createdMethod is "Manually"
   * - API-created offers: Only visibility, advertiserId, and advertiserName can be updated
   * - Manually-created offers: All fields can be updated
   *
   * Response:
   * {
   *   id: string,
   *   offerName: string,
   *   advName: string,
   *   createdMethod: "Manually" | "API",
   *   status: "Active" | "Inactive",
   *   visibility: "Public" | "Internal" | "Hidden",
   *   updatedAt: string                     // ISO timestamp
   * }
   *
   * Error Handling:
   * - 400: Validation errors
   *   - Invalid offerId format (if provided)
   *   - Invalid status value (if provided)
   *   - Invalid visibility value
   *   - Return field-specific errors
   *
   * - 401: Unauthorized - redirect to login
   * - 403: Forbidden - show permission denied
   * - 404: Offer not found
   * - 409: Conflict - offerId already exists (if changing offerId)
   * - 500: Server error - show error with retry option
   *
   * Success:
   * - Return updated offer object
   * - Show success notification
   * - Refresh offers list
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

    if (!validateForm() || !offer) {
      toast.error("Validation failed", {
        description: "Please fix the errors in the form before submitting.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const updatePayload: Partial<Offer> = {
        visibility: formData.visibility,
      };

      if (!isApiSource(offer.createdMethod)) {
        updatePayload.id = formData.offerId;
        updatePayload.offerName = formData.offerName;
        updatePayload.status = formData.status;
        updatePayload.advName = formData.advertiserName;
      }

      const updatedOffer = await updateOffer(offer.id, updatePayload);

      if (updatedOffer) {
        toast.success("Offer updated successfully", {
          description: `Offer ${updatedOffer.id} has been updated.`,
        });
        setInitialFormData(null);
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to update offer. Please try again.";
      setError(errorMessage);
      toast.error("Failed to update offer", {
        description: errorMessage,
      });
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

  const updateFormField = <K extends keyof EditOfferFormData>(
    field: K,
    value: EditOfferFormData[K]
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
          .edit-offer-modal-input:focus-visible {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
          .edit-offer-modal-input:-webkit-autofill,
          .edit-offer-modal-input:-webkit-autofill:hover,
          .edit-offer-modal-input:-webkit-autofill:focus,
          .edit-offer-modal-input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
            box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            background-color: ${variables.colors.inputBackgroundColor} !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .edit-offer-modal-input::selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .edit-offer-modal-input::-moz-selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .edit-offer-modal-select:focus-visible {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
          .edit-offer-modal-textarea:focus-visible {
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
              Offer Details
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
            {isLoading ? (
              <div className="space-y-8 w-full">
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-20" />
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
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
                <div className="border-t pt-6">
                  <div className="space-y-6">
                    <Skeleton className="h-5 w-32" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-full rounded-md" />
                      </div>
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-12 w-full rounded-md" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ) : error && !offer ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-destructive">{error}</div>
              </div>
            ) : offer ? (
              <div className="space-y-8 w-full">
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Offer ID
                      </Label>
                      <div className="min-h-10 flex items-center">
                        {!isApiSource(offer.createdMethod) &&
                        isEditingOfferId ? (
                          <div className="flex items-center gap-2 w-full">
                            <Input
                              value={formData.offerId}
                              onChange={(e) =>
                                updateFormField("offerId", e.target.value)
                              }
                              disabled={isSubmitting}
                              className="h-10 font-inter edit-offer-modal-input flex-1 text-sm"
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
                                if (offer) {
                                  updateFormField("offerId", offer.id);
                                }
                                setIsEditingOfferId(false);
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
                              onClick={() => setIsEditingOfferId(false)}
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
                              {offer.id}
                            </span>
                            {!isApiSource(offer.createdMethod) && (
                              <button
                                type="button"
                                onClick={() => setIsEditingOfferId(true)}
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
                      {validationErrors.offerId && (
                        <p className="text-xs text-destructive font-inter mt-1">
                          {validationErrors.offerId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Status
                      </Label>
                      {!isApiSource(offer.createdMethod) ? (
                        <Select
                          value={formData.status}
                          onValueChange={(value: "Active" | "Inactive") =>
                            updateFormField("status", value)
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger
                            className="w-full h-10 font-inter edit-offer-modal-select text-sm"
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
                                offer.status === "Active"
                                  ? variables.colors
                                      .approvedAssetsBackgroundColor
                                  : variables.colors
                                      .rejectedAssetsBackgroundColor,
                              borderColor:
                                offer.status === "Active"
                                  ? "#86EFAC"
                                  : "#FFC2A3",
                              color:
                                offer.status === "Active"
                                  ? variables.colors.approvedAssetsIconColor
                                  : variables.colors.rejectedAssetsIconColor,
                            }}
                          >
                            {offer.status}
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
                          {offer.createdMethod}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Offer Name
                    </Label>
                    <div className="min-h-10 flex items-center">
                      {!isApiSource(offer.createdMethod) &&
                      isEditingOfferName ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input
                            value={formData.offerName}
                            onChange={(e) =>
                              updateFormField("offerName", e.target.value)
                            }
                            disabled={isSubmitting}
                            className="h-10 font-inter edit-offer-modal-input flex-1 text-sm"
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
                              if (offer) {
                                updateFormField("offerName", offer.offerName);
                              }
                              setIsEditingOfferName(false);
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
                            onClick={() => setIsEditingOfferName(false)}
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
                            {offer.offerName}
                          </span>
                          {!isApiSource(offer.createdMethod) && (
                            <button
                              type="button"
                              onClick={() => setIsEditingOfferName(true)}
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
                    {validationErrors.offerName && (
                      <p className="text-xs text-destructive font-inter mt-1">
                        {validationErrors.offerName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="advertiser"
                          className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                          Advertiser <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          open={advertiserSelectOpen}
                          onOpenChange={(open) => {
                            if (offer && !isApiSource(offer.createdMethod)) {
                              setAdvertiserSelectOpen(open);
                              if (!open) {
                                setAdvertiserSearchQuery("");
                              }
                            }
                          }}
                          value={formData.advertiserId}
                          onValueChange={(value) => {
                            const selectedAdvertiser = advertisers.find(
                              (adv) => adv.id === value
                            );
                            if (selectedAdvertiser) {
                              setFormData((prev) => ({
                                ...prev,
                                advertiserId: selectedAdvertiser.id,
                                advertiserName:
                                  selectedAdvertiser.advertiserName,
                              }));
                              setAdvertiserSearchQuery("");
                              setAdvertiserSelectOpen(false);
                              setValidationErrors((prev) => ({
                                ...prev,
                                advertiserId: undefined,
                                advertiserName: undefined,
                              }));
                            }
                          }}
                          disabled={
                            isSubmitting ||
                            isLoadingAdvertisers ||
                            (offer ? isApiSource(offer.createdMethod) : false)
                          }
                        >
                          <SelectTrigger
                            id="advertiser"
                            className="w-full h-12! font-inter edit-offer-modal-select"
                            style={{
                              backgroundColor:
                                variables.colors.inputBackgroundColor,
                              borderColor: variables.colors.inputBorderColor,
                              color: variables.colors.inputTextColor,
                              height: "3rem",
                            }}
                          >
                            <SelectValue placeholder="Select advertiser...">
                              {formData.advertiserId && formData.advertiserName
                                ? `${formData.advertiserId} - ${formData.advertiserName}`
                                : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            className="max-h-[400px]"
                            style={{
                              backgroundColor:
                                variables.colors.inputBackgroundColor,
                              borderColor: variables.colors.inputBorderColor,
                            }}
                          >
                            <div
                              className="p-2 border-b"
                              style={{
                                borderColor: variables.colors.inputBorderColor,
                              }}
                            >
                              <Input
                                placeholder="Search by ID or name..."
                                value={advertiserSearchQuery}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setAdvertiserSearchQuery(e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="h-10 font-inter"
                                style={{
                                  backgroundColor:
                                    variables.colors.inputBackgroundColor,
                                  borderColor:
                                    variables.colors.inputBorderColor,
                                  color: variables.colors.inputTextColor,
                                }}
                              />
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {isLoadingAdvertisers ? (
                                <div
                                  className="py-6 text-center text-sm font-inter px-2"
                                  style={{
                                    color: variables.colors.inputTextColor,
                                  }}
                                >
                                  Loading advertisers...
                                </div>
                              ) : filteredAdvertisers.length === 0 ? (
                                <div
                                  className="py-6 text-center text-sm font-inter px-2"
                                  style={{
                                    color: variables.colors.inputTextColor,
                                  }}
                                >
                                  No advertiser found.
                                </div>
                              ) : (
                                filteredAdvertisers.map((advertiser) => (
                                  <SelectItem
                                    key={advertiser.id}
                                    value={advertiser.id}
                                    className="font-inter"
                                  >
                                    <span
                                      className="font-semibold"
                                      style={{
                                        color: variables.colors.inputTextColor,
                                      }}
                                    >
                                      {advertiser.id}
                                    </span>
                                    <span
                                      className="ml-2"
                                      style={{
                                        color:
                                          variables.colors.descriptionColor,
                                      }}
                                    >
                                      - {advertiser.advertiserName}
                                    </span>
                                  </SelectItem>
                                ))
                              )}
                            </div>
                          </SelectContent>
                        </Select>
                        {(validationErrors.advertiserId ||
                          validationErrors.advertiserName) && (
                          <p className="text-sm text-destructive font-inter">
                            {validationErrors.advertiserId ||
                              validationErrors.advertiserName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="visibility"
                          className="font-inter text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                          Visibility
                        </Label>
                        <Select
                          value={formData.visibility}
                          onValueChange={(
                            value: "Public" | "Internal" | "Hidden"
                          ) => updateFormField("visibility", value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger
                            id="visibility"
                            className="w-full h-12! font-inter edit-offer-modal-select"
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
                            <SelectItem value="Public">Public</SelectItem>
                            <SelectItem value="Internal">Internal</SelectItem>
                            <SelectItem value="Hidden">Hidden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
