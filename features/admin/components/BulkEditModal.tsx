"use client";

/**
 * TODO: BACKEND - BulkEditModal Component Backend Integration
 *
 * This component handles bulk editing of multiple offers simultaneously.
 * Currently uses mock data and client-side filtering.
 *
 * Backend Integration Requirements:
 *
 * 1. Offer Selection & Filtering:
 *    - Currently filters client-side from all offers
 *    - Backend should support: GET /api/admin/offers with query parameters
 *    - Query params: search, status, createdBy, page, limit
 *    - Response should include pagination metadata
 *    - Consider server-side filtering for better performance with large datasets
 *
 * 2. Bulk Update API:
 *    - Endpoint: POST /api/admin/offers/bulk-update
 *    - Handles updating multiple offers with same changes
 *    - Supports: visibility, brand guidelines (URL/file/text), brand guidelines notes
 *    - Returns partial success if some offers fail
 *    - See handleSubmit function for detailed API specification
 *
 * 3. File Upload Handling:
 *    - Brand guidelines file uploads use multipart/form-data
 *    - Validate file size (max 10MB) and type (.doc, .docx, .pdf)
 *    - Store files in secure storage (S3, Azure Blob, etc.)
 *    - Return file URLs for reference
 *    - Handle file replacement (delete old file when updating)
 *
 * 4. Performance Considerations:
 *    - For large batches (100+ offers), consider background job processing
 *    - Provide progress updates via WebSocket/SSE
 *    - Show progress bar to user
 *    - Allow cancellation of long-running operations
 *
 * 5. Error Handling:
 *    - Handle partial failures gracefully
 *    - Show which offers succeeded and which failed
 *    - Provide retry mechanism for failed offers
 *    - Log all bulk operations for audit trail
 *
 * 6. Validation:
 *    - Validate all offer IDs exist before processing
 *    - Validate file uploads (size, type)
 *    - Validate URL format for brand guidelines
 *    - Return field-specific validation errors
 *
 * 7. Audit Trail:
 *    - Log all bulk update operations
 *    - Track which user performed the bulk update
 *    - Store previous values for rollback if needed
 *    - Track which offers were affected
 */

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

import { bulkUpdateOffers } from "../services/offers.service";
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

  /**
   * TODO: BACKEND - Implement Bulk Update Offers API
   *
   * This function handles bulk updating of multiple offers with the same changes.
   *
   * Endpoint: POST /api/admin/offers/bulk-update
   *
   * Request Body:
   * {
   *   offerIds: string[],                    // Array of offer IDs to update
   *   updates: {
   *     visibility?: "Public" | "Internal" | "Hidden",
   *     brandGuidelines?: {
   *       type: "url" | "file" | "text",
   *       url?: string,                       // If type is "url"
   *       file?: File,                        // If type is "file" - use FormData
   *       text?: string,                      // If type is "text"
   *       notes?: string                      // Brand guidelines notes
   *     }
   *   }
   * }
   *
   * For file uploads:
   * - Use multipart/form-data
   * - Validate file size (max 10MB)
   * - Validate file type (only .doc, .docx, .pdf)
   * - Store file in secure storage (S3, Azure Blob, etc.)
   * - Return file URL or file ID for reference
   * - Apply the same file to all selected offers OR create separate file per offer
   *
   * Response:
   * {
   *   success: boolean,
   *   updated: number,                        // Number of offers successfully updated
   *   failed: number,                         // Number of offers that failed to update
   *   results: {
   *     successful: string[],                 // Array of offer IDs that were updated
   *     failed: {                            // Array of offers that failed
   *       offerId: string,
   *       error: string
   *     }[]
   *   },
   *   message: string
   * }
   *
   * Error Handling:
   * - 400: Validation errors
   *   - Empty offerIds array
   *   - Invalid offer IDs
   *   - Invalid visibility value
   *   - Invalid file type/size for brand guidelines
   *   - Invalid URL format for brand guidelines
   *   - Return field-specific errors
   *
   * - 401: Unauthorized - redirect to login
   * - 403: Forbidden - show permission denied
   * - 404: One or more offers not found - return which offers failed
   * - 413: File too large - show specific error
   * - 500: Server error - show error with retry option
   *
   * Business Rules:
   * - All selected offers must exist
   * - If any offer fails, return partial success with details
   * - Brand guidelines file: Decide if same file applies to all or separate files
   * - Brand guidelines URL: Can be same for all offers
   * - Brand guidelines text: Can be same for all offers
   * - Brand guidelines notes: Can be same for all offers
   * - Log all bulk update actions in audit trail
   * - Track which user performed the bulk update
   *
   * Performance Considerations:
   * - For large batches (100+ offers), consider:
   *   - Processing in chunks
   *   - Background job processing
   *   - Progress updates via WebSocket/SSE
   *   - Show progress bar to user
   *
   * Implementation Example:
   * ```typescript
   * const formDataToSend = new FormData();
   * formDataToSend.append('offerIds', JSON.stringify(Array.from(selectedOfferIds)));
   * formDataToSend.append('visibility', formData.visibility);
   *
   * if (formData.brandGuidelinesType === 'file' && formData.brandGuidelinesFile) {
   *   formDataToSend.append('brandGuidelinesFile', formData.brandGuidelinesFile);
   *   formDataToSend.append('brandGuidelinesType', 'file');
   * } else if (formData.brandGuidelinesType === 'url') {
   *   formDataToSend.append('brandGuidelinesUrl', formData.brandGuidelinesUrl);
   *   formDataToSend.append('brandGuidelinesType', 'url');
   * } else if (formData.brandGuidelinesType === 'text') {
   *   formDataToSend.append('brandGuidelinesText', formData.brandGuidelinesText);
   *   formDataToSend.append('brandGuidelinesType', 'text');
   * }
   *
   * if (formData.brandGuidelinesNotes) {
   *   formDataToSend.append('brandGuidelinesNotes', formData.brandGuidelinesNotes);
   * }
   *
   * const response = await fetch('/api/admin/offers/bulk-update', {
   *   method: 'POST',
   *   headers: {
   *     'Authorization': `Bearer ${getAuthToken()}`
   *   },
   *   body: formDataToSend
   * });
   *
   * if (!response.ok) {
   *   const error = await response.json();
   *   throw new Error(error.message || 'Failed to update offers');
   * }
   *
   * const result = await response.json();
   * // Handle partial success if needed
   * if (result.failed > 0) {
   *   // Show warning with failed offer IDs
   * }
   * ```
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // TODO: BACKEND - Replace with actual API call
      // Prepare updates object
      const updates: {
        visibility?: "Public" | "Internal" | "Hidden";
        brandGuidelines?: {
          type: "url" | "file" | "text";
          url?: string;
          file?: File;
          text?: string;
          notes?: string;
        };
      } = {
        visibility: formData.visibility,
      };

      // Add brand guidelines to updates
      if (
        formData.brandGuidelinesType === "url" &&
        formData.brandGuidelinesUrl &&
        formData.brandGuidelinesUrl !== "https://"
      ) {
        updates.brandGuidelines = {
          type: "url",
          url: formData.brandGuidelinesUrl,
          notes: formData.brandGuidelinesNotes || undefined,
        };
      } else if (
        formData.brandGuidelinesType === "upload" &&
        formData.brandGuidelinesFile
      ) {
        updates.brandGuidelines = {
          type: "file",
          file: formData.brandGuidelinesFile,
          notes: formData.brandGuidelinesNotes || undefined,
        };
      } else if (
        formData.brandGuidelinesType === "text" &&
        formData.brandGuidelinesText
      ) {
        updates.brandGuidelines = {
          type: "text",
          text: formData.brandGuidelinesText,
          notes: formData.brandGuidelinesNotes || undefined,
        };
      } else if (formData.brandGuidelinesNotes) {
        // If only notes are provided without brand guidelines content
        updates.brandGuidelines = {
          type: "url", // Default type, backend should handle notes-only updates
          notes: formData.brandGuidelinesNotes,
        };
      }

      // Call bulk update API
      const response = await bulkUpdateOffers(
        Array.from(selectedOfferIds),
        updates
      );

      // Handle response
      if (response.failed > 0) {
        // Partial success - show warning with failed offer IDs
        const failedIds = response.results.failed
          .map((f) => f.offerId)
          .join(", ");
        setError(
          `Successfully updated ${response.updated} offer(s), but ${response.failed} failed: ${failedIds}`
        );
      } else {
        // Full success
        onSuccess?.();
        onOpenChange(false);
      }

      // Simulate API call for now (remove when backend is ready)
      // await new Promise((resolve) => setTimeout(resolve, 1000));

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

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  }, [isSubmitting, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .bulk-edit-input:focus-visible {
              outline: none !important;
              border-color: ${inputRingColor} !important;
              box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
            }
            .bulk-edit-input:-webkit-autofill,
            .bulk-edit-input:-webkit-autofill:hover,
            .bulk-edit-input:-webkit-autofill:focus,
            .bulk-edit-input:-webkit-autofill:active {
              -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
              -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
              box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
              background-color: ${variables.colors.inputBackgroundColor} !important;
              color: ${variables.colors.inputTextColor} !important;
            }
            .bulk-edit-select:focus-visible,
            .bulk-edit-textarea:focus-visible {
              outline: none !important;
              border-color: ${inputRingColor} !important;
              box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
            }
          `,
        }}
      />
      <DialogContent
        className="max-w-[100vw]! w-screen! h-screen! max-h-screen! m-0! rounded-none! p-0! top-0! left-0! right-0! bottom-0! translate-x-0! translate-y-0! sm:!max-w-[100vw]!"
        showCloseButton={false}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader
            className="px-8 py-5 border-b shrink-0"
            style={{
              backgroundColor: variables.colors.cardHeaderBackgroundColor,
            }}
          >
            <div className="flex items-center justify-between">
              <DialogTitle
                className="text-xl font-semibold font-inter"
                style={{
                  color: variables.colors.cardHeaderTextColor,
                }}
              >
                Bulk Edit Offers
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <DialogBody className="flex-1 overflow-y-auto px-8 py-6 min-h-0 max-h-screen">
            <div className="flex flex-col gap-8 min-h-full">
              {/* Section 1: Offer Selection */}
              <div className="space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold font-inter text-foreground">
                    Select Offers
                  </h2>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none"
                      style={{
                        color: variables.colors.inputPlaceholderColor,
                      }}
                    />
                    <Input
                      type="text"
                      placeholder="Search offers by ID or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 font-inter bulk-edit-input"
                      style={{
                        backgroundColor: variables.colors.inputBackgroundColor,
                        borderColor: variables.colors.inputBorderColor,
                        color: variables.colors.inputTextColor,
                      }}
                    />
                  </div>
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
                        className="h-11 font-inter font-medium rounded-md border shadow-sm hover:shadow-md transition-shadow duration-200"
                        style={{
                          color: variables.colors.buttonOutlineTextColor,
                          borderColor:
                            variables.colors.buttonOutlineBorderColor,
                          backgroundColor: variables.colors.cardBackground,
                        }}
                      >
                        <ListFilter className="h-4 w-4 mr-2" />
                        Filter
                        {hasActiveFilters && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            {
                              [
                                statusFilter !== "All" && 1,
                                createdByFilter !== "All" && 1,
                              ].filter(Boolean).length
                            }
                          </span>
                        )}
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
                            <div className="flex items-center gap-2">
                              {statusFilter !== "All" && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusFilter("All");
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                                  title="Clear Status"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setStatusFilter("All");
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3 text-gray-500" />
                                </div>
                              )}
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
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
                            <div className="flex items-center gap-2">
                              {createdByFilter !== "All" && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCreatedByFilter("All");
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                                  title="Clear Created By"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCreatedByFilter("All");
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3 text-gray-500" />
                                </div>
                              )}
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </button>
                        </div>

                        {activeCategory && (
                          <div className="w-1/2 p-3">
                            {activeCategory === "status" && (
                              <div className="space-y-1">
                                {["All", "Active", "Inactive"].map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      setStatusFilter(status as StatusFilter);
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
                                ))}
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
                              backgroundColor: variables.colors.cardBackground,
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
              </div>

              {/* Section 2: Offer Lists */}
              <div className="grid grid-cols-2 gap-6 max-h-[400px] shrink-0">
                {/* Available Offers */}
                <div className="flex flex-col max-h-[350px]">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <Label className="text-sm font-semibold font-inter text-foreground">
                      Available Offers
                    </Label>
                    <span className="text-xs text-muted-foreground font-inter">
                      {availableOffers.length} available
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg bg-background">
                    {isLoadingOffers ? (
                      <div className="flex items-center justify-center h-full p-8">
                        <div className="text-sm text-muted-foreground font-inter">
                          Loading offers...
                        </div>
                      </div>
                    ) : availableOffers.length === 0 ? (
                      <div className="flex items-center justify-center h-full p-8">
                        <div className="text-sm text-muted-foreground font-inter text-center">
                          <div>No offers available</div>
                          {hasActiveFilters && (
                            <div className="mt-2 text-xs">
                              Try adjusting your filters
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {availableOffers.map((offer) => (
                          <button
                            key={offer.id}
                            type="button"
                            onClick={() => handleSelectOffer(offer.id)}
                            className="w-full px-4 py-3.5 transition-colors hover:bg-muted/50 flex items-center gap-3 group"
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
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-sm font-medium font-inter text-foreground truncate">
                                {offer.offerName}
                              </div>
                              <div className="text-xs text-muted-foreground font-inter mt-0.5">
                                ID: {offer.id}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Offers */}
                <div className="flex flex-col max-h-[350px]">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <Label className="text-sm font-semibold font-inter text-foreground">
                      Selected Offers ({selectedOfferIds.size})
                    </Label>
                    {selectedOfferIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-xs font-inter font-medium cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg bg-muted/20">
                    {selectedOffers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-8">
                        <div className="text-sm text-muted-foreground font-inter text-center">
                          <div>No offers selected</div>
                          <div className="mt-2 text-xs">
                            Click on offers from the left to select them
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {selectedOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="w-full px-4 py-3.5 flex items-center gap-3"
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
                              <div className="text-sm font-medium font-inter text-foreground truncate">
                                {offer.offerName}
                              </div>
                              <div className="text-xs text-muted-foreground font-inter mt-0.5">
                                ID: {offer.id}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOfferIds((prev) => {
                                  const newSet = new Set(prev);
                                  newSet.delete(offer.id);
                                  return newSet;
                                });
                              }}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors shrink-0"
                            >
                              <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Apply Changes */}
              <div className="shrink-0 border-t pt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold font-inter text-foreground mb-1">
                    Apply Changes
                  </h2>
                  <p className="text-sm text-muted-foreground font-inter">
                    Configure the changes to apply to{" "}
                    {selectedOfferIds.size > 0
                      ? `${selectedOfferIds.size} selected offer${selectedOfferIds.size !== 1 ? "s" : ""}`
                      : "selected offers"}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Visibility */}
                  <div className="lg:col-span-3 space-y-2">
                    <Label
                      htmlFor="visibility"
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-inter"
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
                        className="w-full h-12 font-inter bulk-edit-select"
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

                  {/* Brand Guidelines */}
                  <div className="lg:col-span-9 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground uppercase tracking-wide font-inter">
                        Brand Guidelines
                      </Label>
                      <div className="space-y-3">
                        {/* Tabs */}
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
                            className="font-inter text-sm h-9"
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
                            className="font-inter text-sm h-9"
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
                            className="font-inter text-sm h-9"
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

                        {/* URL Input */}
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
                              className="h-12 font-inter bulk-edit-input"
                              style={{
                                backgroundColor:
                                  variables.colors.inputBackgroundColor,
                                borderColor: variables.colors.inputBorderColor,
                                color: variables.colors.inputTextColor,
                              }}
                            />
                          </div>
                        )}

                        {/* File Upload */}
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
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor =
                                    variables.colors.inputBorderColor;
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

                        {/* Rich Text Editor */}
                        {formData.brandGuidelinesType === "text" && (
                          <div className="space-y-2">
                            <RichTextEditor
                              value={formData.brandGuidelinesText || ""}
                              onChange={(value: string) =>
                                updateFormField("brandGuidelinesText", value)
                              }
                              placeholder="Enter brand guidelines text..."
                              disabled={isSubmitting}
                              className="font-inter"
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

                    {/* Brand Guidelines Notes */}
                    <div className="space-y-2 pt-4 border-t">
                      <Label
                        htmlFor="brandGuidelinesNotes"
                        className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-inter"
                      >
                        Brand Guidelines Notes
                      </Label>
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
                        className="font-inter bulk-edit-textarea resize-none"
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          borderColor: variables.colors.inputBorderColor,
                          color: variables.colors.inputTextColor,
                        }}
                      />
                      {validationErrors.brandGuidelinesNotes && (
                        <p className="text-xs text-destructive font-inter mt-1">
                          {validationErrors.brandGuidelinesNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                    <p className="text-sm text-destructive font-inter">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogBody>

          {/* Footer */}
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 px-8 py-6 border-t bg-muted/20 shrink-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleClose}
                className="w-full sm:w-auto min-w-[120px] h-12 font-inter text-sm"
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
              className="w-full sm:w-auto min-w-[140px] h-12 font-inter text-sm"
              style={{
                backgroundColor:
                  isSubmitting || selectedOfferIds.size === 0
                    ? variables.colors.buttonDisabledBackgroundColor
                    : variables.colors.buttonDefaultBackgroundColor,
                color:
                  isSubmitting || selectedOfferIds.size === 0
                    ? variables.colors.buttonDisabledTextColor
                    : variables.colors.buttonDefaultTextColor,
              }}
            >
              {isSubmitting
                ? "Applying..."
                : `Apply to ${selectedOfferIds.size} Offer${selectedOfferIds.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
