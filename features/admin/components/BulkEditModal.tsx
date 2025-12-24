"use client";

import {
  Search,
  X,
  ListFilter,
  Upload,
  File,
  ChevronRight,
} from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useOffersViewModel } from "../view-models/useOffersViewModel";

type StatusFilter = "All" | "Active" | "Inactive";
type CreatedByFilter = "All" | "API" | "Manually";
type FilterCategory = "status" | "createdBy" | null;

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface BulkEditFormData {
  visibility: "Public" | "Internal" | "Hidden";
  brandGuidelinesType: "url" | "upload" | "text";
  brandGuidelinesUrl: string;
  brandGuidelinesFile: File | null;
  brandGuidelinesText: string;
  brandGuidelinesNotes: string;
}

export function BulkEditModal({
  open,
  onOpenChange,
  onSuccess,
}: BulkEditModalProps) {
  const variables = getVariables();
  const inputRingColor = variables.colors.inputRingColor;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { offers, isLoading: isLoadingOffers } = useOffersViewModel();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOfferIds, setSelectedOfferIds] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [createdByFilter, setCreatedByFilter] =
    useState<CreatedByFilter>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>(null);

  const [formData, setFormData] = useState<BulkEditFormData>({
    visibility: "Public",
    brandGuidelinesType: "url",
    brandGuidelinesUrl: "https://",
    brandGuidelinesFile: null,
    brandGuidelinesText: "",
    brandGuidelinesNotes: "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof BulkEditFormData, string>>
  >({});

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedOfferIds(new Set());
      setFormData({
        visibility: "Public",
        brandGuidelinesType: "url",
        brandGuidelinesUrl: "https://",
        brandGuidelinesFile: null,
        brandGuidelinesText: "",
        brandGuidelinesNotes: "",
      });
      setValidationErrors({});
      setError(null);
      setStatusFilter("All");
      setCreatedByFilter("All");
      setIsFilterOpen(false);
      setActiveCategory(null);
    }
  }, [open]);

  const filteredOffers = offers.filter((offer) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      offer.id.toLowerCase().includes(query) ||
      offer.offerName.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" || offer.status === statusFilter;
    const matchesCreatedBy =
      createdByFilter === "All" ||
      (createdByFilter === "Manually" && offer.createdMethod === "Manually") ||
      (createdByFilter === "API" && offer.createdMethod.startsWith("API"));

    return matchesSearch && matchesStatus && matchesCreatedBy;
  });

  const availableOffers = filteredOffers.filter(
    (offer) => !selectedOfferIds.has(offer.id)
  );
  const selectedOffers = filteredOffers.filter((offer) =>
    selectedOfferIds.has(offer.id)
  );

  const handleSelectOffer = (offerId: string) => {
    setSelectedOfferIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(offerId);
      return newSet;
    });
  };

  const handleClearAll = () => {
    setSelectedOfferIds(new Set());
  };

  const hasActiveFilters = statusFilter !== "All" || createdByFilter !== "All";

  const clearAllFilters = () => {
    setStatusFilter("All");
    setCreatedByFilter("All");
  };

  const updateFormField = <K extends keyof BulkEditFormData>(
    field: K,
    value: BulkEditFormData[K]
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

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof BulkEditFormData, string>> = {};

    if (selectedOfferIds.size === 0) {
      setError("Please select at least one offer");
      return false;
    }

    if (
      formData.brandGuidelinesUrl &&
      formData.brandGuidelinesUrl !== "https://" &&
      !formData.brandGuidelinesUrl.startsWith("https://")
    ) {
      errors.brandGuidelinesUrl =
        "Brand guidelines URL must start with https://";
    }

    if (formData.brandGuidelinesNotes.length > 2000) {
      errors.brandGuidelinesNotes =
        "Brand guidelines notes cannot exceed 2000 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // TODO: Implement bulk update API call
      // await bulkUpdateOffers(Array.from(selectedOfferIds), formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update offers");
    } finally {
      setIsSubmitting(false);
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
            .edit-offer-modal-input::selection,
            .edit-offer-modal-input::-moz-selection {
              background-color: ${inputRingColor}40 !important;
              color: ${variables.colors.inputTextColor} !important;
            }
            .edit-offer-modal-select:focus-visible,
            .edit-offer-modal-textarea:focus-visible {
              outline: none !important;
              border-color: ${inputRingColor} !important;
              box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
            }
          `,
        }}
      />
      <DialogContent
        className="!max-w-[100vw] !w-screen !h-screen !max-h-screen !m-0 !rounded-none !p-0 !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 sm:!max-w-[100vw]"
        showCloseButton={false}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader
            className="px-6 py-5 border-b"
            style={{
              backgroundColor: variables.colors.cardHeaderBackgroundColor,
            }}
          >
            <DialogTitle
              className="text-lg font-semibold font-inter"
              style={{
                color: variables.colors.cardHeaderTextColor,
              }}
            >
              Bulk Edit
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="flex-1 overflow-y-auto px-8 py-6 !max-h-none">
            <div className="space-y-8">
              {/* Offer Selection */}
              <div className="w-full flex items-center justify-start gap-4">
                <h2 className="w-[11%] font-inter text-lg font-semibold">
                  Offer Selection
                </h2>
                <div className="relative w-[89%]">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                    style={{
                      color: variables.colors.inputPlaceholderColor,
                    }}
                  />
                  <Input
                    type="text"
                    placeholder="Search for Offers"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 font-inter"
                    style={{
                      backgroundColor: variables.colors.inputBackgroundColor,
                      borderColor: variables.colors.inputBorderColor,
                      color: variables.colors.inputTextColor,
                    }}
                  />
                </div>
              </div>

              {/* Available Offers */}
              <div className="grid grid-cols-2 gap-4 h-[400px]">
                {/* Available Offers List */}
                <div className="flex flex-col gap-4 overflow-hidden bg-white">
                  <div className="flex items-center justify-start gap-2">
                    <button
                      type="button"
                      disabled
                      className="px-3 py-3 rounded-[6px] border border-[#DCDCDC] shadow-[0_2px_4px_0_rgba(30,64,175,0.15)] font-inter text-xs font-medium text-[#525252] cursor-default bg-white"
                    >
                      Available Offers ({availableOffers.length})
                    </button>

                    <Popover
                      open={isFilterOpen}
                      onOpenChange={(open) => {
                        setIsFilterOpen(open);
                        if (!open) {
                          setActiveCategory(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.15)] transition-shadow duration-200"
                          style={{
                            color: variables.colors.buttonOutlineTextColor,
                            borderColor:
                              variables.colors.buttonOutlineBorderColor,
                            backgroundColor: variables.colors.cardBackground,
                          }}
                        >
                          <ListFilter className="h-5 w-5" />
                          Filter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className={`p-0 transition-all ${activeCategory ? "w-[500px]" : "w-[250px]"}`}
                        align="start"
                      >
                        <div className="flex">
                          <div
                            className={`${activeCategory ? "w-1/2 border-r border-gray-200" : "w-full"} p-3`}
                          >
                            <button
                              onClick={() => setActiveCategory("status")}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                                activeCategory === "status"
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span>Status</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => setActiveCategory("createdBy")}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                                activeCategory === "createdBy"
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span>Created by</span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </button>
                          </div>

                          {activeCategory && (
                            <div className="w-1/2 p-3">
                              {activeCategory === "status" && (
                                <div className="space-y-1">
                                  {["All", "Active", "Inactive"].map(
                                    (status) => (
                                      <button
                                        key={status}
                                        onClick={() => {
                                          setStatusFilter(
                                            status as StatusFilter
                                          );
                                          setIsFilterOpen(false);
                                          setActiveCategory(null);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                                          statusFilter === status
                                            ? "bg-gray-100 text-gray-900 font-medium"
                                            : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                      >
                                        {status}
                                      </button>
                                    )
                                  )}
                                </div>
                              )}

                              {activeCategory === "createdBy" && (
                                <div className="space-y-1">
                                  {["All", "API", "Manually"].map((method) => (
                                    <button
                                      key={method}
                                      onClick={() => {
                                        setCreatedByFilter(
                                          method as CreatedByFilter
                                        );
                                        setIsFilterOpen(false);
                                        setActiveCategory(null);
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                                        createdByFilter === method
                                          ? "bg-gray-100 text-gray-900 font-medium"
                                          : "text-gray-600 hover:bg-gray-50"
                                      }`}
                                    >
                                      {method}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {hasActiveFilters && (
                          <div className="border-t border-gray-200 p-3">
                            <Button
                              variant="outline"
                              onClick={clearAllFilters}
                              className="w-full h-9 font-inter text-sm gap-2"
                              style={{
                                borderColor: variables.colors.inputBorderColor,
                                color: variables.colors.inputTextColor,
                                backgroundColor:
                                  variables.colors.cardBackground,
                              }}
                            >
                              <X className="h-4 w-4" />
                              Clear All Filters
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-white">
                    {isLoadingOffers ? (
                      <div className="flex items-center justify-center h-full p-4">
                        <div className="text-sm text-muted-foreground">
                          Loading offers...
                        </div>
                      </div>
                    ) : availableOffers.length === 0 ? (
                      <div className="flex border rounded-lg border border-[#DCDCDC] items-center justify-center h-full p-4">
                        <div className="text-sm text-gray-400">
                          No offers available
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[10px] border border-[#DCDCDC] overflow-hidden bg-white">
                        <div className="space-y-0 ">
                          {availableOffers.map((offer, idx) => (
                            <button
                              key={offer.id}
                              type="button"
                              onClick={() => handleSelectOffer(offer.id)}
                              className={`w-full px-5 py-4.5 transition-colors flex justify-start items-center gap-3 ${
                                idx !== availableOffers.length - 1
                                  ? "border-b border-[#DCDCDC]"
                                  : ""
                              }`}
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    offer.status === "Active"
                                      ? "#10B981"
                                      : "#EAB308",
                                }}
                              />
                              <div className="flex-1 min-w-0 ">
                                <div className="font-inter text-left text-sm font-medium text-gray-700 truncate">
                                  ({offer.id}) {offer.offerName}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className=" flex flex-col overflow-hidden bg-white gap-4">
                  <div className=" flex items-center justify-start gap-4">
                    <button
                      type="button"
                      disabled
                      className="px-3 py-3 rounded-[6px] bg-[#525252] shadow-[0_2px_4px_0_rgba(30,64,175,0.15)] font-inter text-xs font-medium text-white cursor-default"
                    >
                      Selected ({selectedOffers.length})
                    </button>
                    {selectedOfferIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="font-inter text-sm text-blue-600 underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto bg-white">
                    {selectedOffers.length === 0 ? (
                      <div className="flex items-center justify-center h-full p-4">
                        <div className="text-sm text-gray-400">
                          No offers selected
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[10px] border border-[#DCDCDC] overflow-hidden bg-white">
                        <div className="space-y-0">
                          {selectedOffers.map((offer, idx) => (
                            <div
                              key={offer.id}
                              className={`w-full px-5 py-4.5 transition-colors flex items-center gap-3 ${
                                idx !== selectedOffers.length - 1
                                  ? "border-b border-[#DCDCDC]"
                                  : ""
                              }`}
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    offer.status === "Active"
                                      ? "#10B981"
                                      : "#EAB308",
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-inter text-sm font-medium text-gray-700 truncate">
                                  ({offer.id}) {offer.offerName}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Changes */}

              <div className="line bg-gray-200 h-px w-full"></div>

              <div className="space-y-7  p-4 rounded-[10px] border border-[#DCDCDC]">
                <h2 className="font-inter text-base font-semibold">Changes</h2>

                <div className=" w-full h-full flex items-start justify-start gap-4 ">
                  <div className="space-y-2 w-[30%] h-[350px] bg-[#F6F7F9] p-4 rounded-[10px] border border-[#DCDCDC]">
                    <Label
                      htmlFor="visibility"
                      className="font-inter text-sm font-semibold"
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
                        className="w-full h-12 font-inter bulk-edit-modal-select"
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

                  <div className="space-y-4 w-[65%] h-[350px] bg-[#F6F7F9] p-4 rounded-[10px] border border-[#DCDCDC]">
                    <div className=" space-y-2">
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
                                      variables.colors
                                        .buttonDefaultBackgroundColor,
                                    color:
                                      variables.colors.buttonDefaultTextColor,
                                    height: "2.25rem",
                                  }
                                : {
                                    backgroundColor:
                                      variables.colors
                                        .buttonOutlineBackgroundColor,
                                    borderColor:
                                      variables.colors.buttonOutlineBorderColor,
                                    color:
                                      variables.colors.buttonOutlineTextColor,
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
                                      variables.colors
                                        .buttonDefaultBackgroundColor,
                                    color:
                                      variables.colors.buttonDefaultTextColor,
                                    height: "2.25rem",
                                  }
                                : {
                                    backgroundColor:
                                      variables.colors
                                        .buttonOutlineBackgroundColor,
                                    borderColor:
                                      variables.colors.buttonOutlineBorderColor,
                                    color:
                                      variables.colors.buttonOutlineTextColor,
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
                                      variables.colors
                                        .buttonDefaultBackgroundColor,
                                    color:
                                      variables.colors.buttonDefaultTextColor,
                                    height: "2.25rem",
                                  }
                                : {
                                    backgroundColor:
                                      variables.colors
                                        .buttonOutlineBackgroundColor,
                                    borderColor:
                                      variables.colors.buttonOutlineBorderColor,
                                    color:
                                      variables.colors.buttonOutlineTextColor,
                                    height: "2.25rem",
                                  }
                            }
                          >
                            Direct Input
                          </Button>
                        </div>

                        {formData.brandGuidelinesType === "url" && (
                          <div className="space-y-2 overflow-hidden">
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
                                  value =
                                    httpsPrefix + value.replace("http://", "");
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
                                  updateFormField(
                                    "brandGuidelinesUrl",
                                    newValue
                                  );
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
                                  input.setSelectionRange(
                                    httpsLength,
                                    httpsLength
                                  );
                                  return;
                                }

                                if (e.key === "Home") {
                                  e.preventDefault();
                                  input.setSelectionRange(
                                    httpsLength,
                                    httpsLength
                                  );
                                  return;
                                }
                              }}
                              onPaste={(e) => {
                                e.preventDefault();
                                const pastedText =
                                  e.clipboardData.getData("text");
                                let cleanText = pastedText;
                                if (pastedText.startsWith("https://")) {
                                  cleanText = pastedText.replace(
                                    "https://",
                                    ""
                                  );
                                } else if (pastedText.startsWith("http://")) {
                                  cleanText = pastedText.replace("http://", "");
                                }
                                const input = e.currentTarget;
                                const start = Math.max(
                                  input.selectionStart || 0,
                                  8
                                );
                                const end = Math.max(
                                  input.selectionEnd || 0,
                                  8
                                );
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
                                  input.setSelectionRange(
                                    newCursorPos,
                                    newCursorPos
                                  );
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
                                  borderColor:
                                    variables.colors.inputBorderColor,
                                  backgroundColor:
                                    variables.colors.inputBackgroundColor,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor =
                                    inputRingColor;
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
                                  e.currentTarget.style.borderColor =
                                    inputRingColor;
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
                                    style={{
                                      color: variables.colors.inputTextColor,
                                    }}
                                    size={24}
                                  />
                                  <p
                                    className="mb-2 text-sm font-inter"
                                    style={{
                                      color: variables.colors.inputTextColor,
                                    }}
                                  >
                                    <span className="font-semibold">
                                      Click to upload
                                    </span>{" "}
                                    or drag and drop
                                  </p>
                                  <p
                                    className="text-xs font-inter"
                                    style={{
                                      color:
                                        variables.colors.inputPlaceholderColor,
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
                                  borderColor:
                                    variables.colors.inputBorderColor,
                                  backgroundColor:
                                    variables.colors.inputBackgroundColor,
                                }}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <File
                                    size={20}
                                    style={{
                                      color: variables.colors.inputTextColor,
                                    }}
                                    className="shrink-0"
                                  />
                                  <span
                                    className="text-sm font-inter truncate"
                                    style={{
                                      color: variables.colors.inputTextColor,
                                    }}
                                    title={formData.brandGuidelinesFile.name}
                                  >
                                    {formData.brandGuidelinesFile.name}
                                  </span>
                                  <span
                                    className="text-xs font-inter ml-auto shrink-0"
                                    style={{
                                      color:
                                        variables.colors.inputPlaceholderColor,
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
                                    updateFormField(
                                      "brandGuidelinesFile",
                                      null
                                    );
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
                          <div className="space-y-2 overflow-hidden">
                            <RichTextEditor
                              value={formData.brandGuidelinesText || ""}
                              onChange={(value: string) =>
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
                  </div>

                  <div className="flex flex-col space-y-2 w-[65%] h-[350px] bg-[#F6F7F9] p-4 rounded-[10px] border border-[#DCDCDC] overflow-hidden">
                    <Label
                      htmlFor="brandGuidelinesNotes"
                      className="font-inter text-sm font-semibold shrink-0"
                    >
                      Brand Guidelines Notes
                    </Label>
                    <div className="flex-1 min-h-0 flex flex-col">
                      <Textarea
                        id="brandGuidelinesNotes"
                        value={formData.brandGuidelinesNotes || ""}
                        onChange={(e) =>
                          updateFormField(
                            "brandGuidelinesNotes",
                            e.target.value
                          )
                        }
                        placeholder="Enter additional notes about brand guidelines..."
                        disabled={isSubmitting}
                        rows={4}
                        className="font-inter edit-offer-modal-textarea resize-none flex-1 min-h-0 overflow-auto"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: variables.colors.inputBorderColor,
                          color: variables.colors.inputTextColor,
                        }}
                      />
                    </div>
                    {validationErrors.brandGuidelinesNotes && (
                      <p className="text-xs text-destructive font-inter mt-1 shrink-0">
                        {validationErrors.brandGuidelinesNotes}
                      </p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="flex justify-end gap-3  px-8 py-6 pt-4 border-none">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
                className="w-full max-w-60 flex-1 h-12 font-inter text-sm"
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
              disabled={isSubmitting || selectedOfferIds.size === 0}
              className="w-full max-w-60 flex-1 h-12 font-inter text-sm"
              style={{
                backgroundColor: isSubmitting
                  ? variables.colors.buttonDisabledBackgroundColor
                  : variables.colors.buttonDefaultBackgroundColor,
                color: isSubmitting
                  ? variables.colors.buttonDisabledTextColor
                  : variables.colors.buttonDefaultTextColor,
              }}
            >
              {isSubmitting ? "Applying..." : "Apply Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
