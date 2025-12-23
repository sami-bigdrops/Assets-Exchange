"use client";

/**
 * TODO: BACKEND - Offers Component Backend Integration
 *
 * This component currently uses client-side filtering, sorting, and mock data.
 * For production, consider the following backend integrations:
 *
 * 1. Server-Side Filtering & Sorting:
 *    - Move filtering logic to backend for better performance with large datasets
 *    - Endpoint: GET /api/admin/offers with query parameters
 *    - Query params: status, visibility, creationMethod, search, sortBy, sortOrder
 *    - Benefits: Reduced client-side processing, pagination support
 *
 * 2. Real-Time Updates:
 *    - Consider WebSocket/SSE for real-time offer updates
 *    - Notify when offers are created/updated/deleted by other users
 *    - Auto-refresh offers list when changes occur
 *
 * 3. Pagination:
 *    - Implement server-side pagination for large offer lists
 *    - Add pagination controls (page numbers, items per page)
 *    - Endpoint should return: { data: Offer[], pagination: { page, limit, total, totalPages } }
 *
 * 4. Search Optimization:
 *    - Consider full-text search on backend for better performance
 *    - Support advanced search (filters combined with search)
 *    - Add search suggestions/autocomplete
 *
 * 5. Caching Strategy:
 *    - Implement caching for frequently accessed offers
 *    - Cache invalidation on updates
 *    - Consider using React Query or SWR for data fetching
 *
 * 6. Error Handling:
 *    - Implement retry logic for failed requests
 *    - Show user-friendly error messages
 *    - Log errors for debugging
 *
 * 7. Loading States:
 *    - Add skeleton loaders for better UX
 *    - Show progress indicators for long-running operations
 *    - Implement optimistic updates where appropriate
 */

import {
  ChevronRight,
  ListFilter,
  Plus,
  Search,
  X,
  Edit,
  Download,
} from "lucide-react";
import { useState } from "react";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import type { Offer as OfferType } from "../types/admin.types";
import { useOffersViewModel } from "../view-models/useOffersViewModel";

import { EntityDataTable, EntityDataCard } from "./EntityDataTable";
import { NewOfferManuallyModal } from "./NewOfferManuallyModal";

type StatusFilter = "Active" | "Inactive" | null;
type VisibilityFilter = "Public" | "Internal" | "Hidden" | null;
type CreationMethodFilter = "Manually" | "API" | null;
type SortByFilter = "New to Old" | "Old to New" | null;
type FilterCategory =
  | "status"
  | "visibility"
  | "creationMethod"
  | "sortBy"
  | null;

export function Offers() {
  const variables = getVariables();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>(null);
  const [creationMethodFilter, setCreationMethodFilter] =
    useState<CreationMethodFilter>(null);
  const [sortByFilter, setSortByFilter] = useState<SortByFilter>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>(null);
  const [offersVisibility, setOffersVisibility] = useState<
    Record<string, "Public" | "Internal" | "Hidden">
  >({});
  const [isNewOfferModalOpen, setIsNewOfferModalOpen] = useState(false);

  const { offers, isLoading, error } = useOffersViewModel();

  const columns = [
    { header: "ID", width: "100px" },
    { header: "Offer Name", width: "1.8fr" },
    { header: "Adv Name", width: "1fr" },
    { header: "Created Manually / via API", width: "1fr" },
    { header: "Status", width: "1fr" },
    { header: "Actions", width: "1fr" },
  ];

  const offersWithUpdatedVisibility = offers.map((offer) => ({
    ...offer,
    visibility: offersVisibility[offer.id] || offer.visibility,
  }));

  const filteredOffers = offersWithUpdatedVisibility
    .filter((offer) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        offer.id.toLowerCase().includes(query) ||
        offer.offerName.toLowerCase().includes(query) ||
        offer.advName.toLowerCase().includes(query);

      const matchesStatus = !statusFilter || offer.status === statusFilter;
      const matchesVisibility =
        !visibilityFilter || offer.visibility === visibilityFilter;
      const matchesCreationMethod =
        !creationMethodFilter ||
        (creationMethodFilter === "Manually" &&
          offer.createdMethod === "Manually") ||
        (creationMethodFilter === "API" &&
          offer.createdMethod.startsWith("API"));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesVisibility &&
        matchesCreationMethod
      );
    })
    .sort((a, b) => {
      if (!sortByFilter) return 0;

      const aId = parseInt(a.id.replace(/\D/g, ""));
      const bId = parseInt(b.id.replace(/\D/g, ""));

      if (sortByFilter === "New to Old") {
        return bId - aId;
      } else {
        return aId - bId;
      }
    });

  /**
   * TODO: BACKEND - Implement Edit Details Handler
   *
   * Endpoint: GET /api/admin/offers/:id
   *
   * Requirements:
   * 1. Fetch full offer details by ID including:
   *    - All offer fields (offerName, advName, status, visibility, etc.)
   *    - Brand guidelines (URL, file, or text content)
   *    - Associated advertiser information
   *    - Creation metadata (createdAt, createdBy, updatedAt, etc.)
   *
   * 2. Open a modal/form with pre-filled data for editing
   *    - Use similar structure to NewOfferManuallyModal
   *    - Pre-populate all form fields with fetched data
   *    - Handle brand guidelines based on type (url/file/text)
   *
   * 3. On save, call: PUT /api/admin/offers/:id
   *    - Request body: {
   *        offerName: string,
   *        advertiserId: string,
   *        advertiserName: string,
   *        status: "Active" | "Inactive",
   *        visibility: "Public" | "Internal" | "Hidden",
   *        brandGuidelines?: {
   *          type: "url" | "file" | "text",
   *          url?: string,
   *          file?: File,
   *          text?: string
   *        }
   *      }
   *    - Validate all required fields
   *    - Return updated offer object
   *
   * 4. Error Handling:
   *    - 404: Offer not found - show error message
   *    - 400: Validation errors - show field-specific errors in form
   *    - 401: Unauthorized - redirect to login
   *    - 403: Forbidden - show permission denied message
   *    - 500: Server error - show generic error with retry option
   *
   * 5. Success:
   *    - Close edit modal
   *    - Refresh offers list (call useOffersViewModel refresh)
   *    - Show success notification
   *    - Update local state if needed
   */
  const handleEditDetails = (_id: string) => {
    // TODO: Implement API call to fetch offer details
    // TODO: Open edit modal with fetched data
    // TODO: Handle form submission and API update
  };

  /**
   * TODO: BACKEND - Implement Brand Guidelines Handler
   *
   * Endpoint: GET /api/admin/offers/:id/brand-guidelines
   *
   * Requirements:
   * 1. Fetch brand guidelines for the offer:
   *    - If type is "url": return { type: "url", url: string }
   *    - If type is "file": return {
   *        type: "file",
   *        fileName: string,
   *        fileUrl: string,
   *        fileSize?: number,
   *        mimeType?: string
   *      }
   *    - If type is "text": return { type: "text", content: string }
   *
   * 2. Display brand guidelines in a modal/viewer:
   *    - For URL: Show link with "Open in new tab" button and iframe preview if possible
   *    - For file: Show download button, file info (name, size), and preview if possible
   *      - PDF: Use PDF viewer component
   *      - DOCX: Show download option with file info
   *    - For text: Display formatted rich text content in read-only editor
   *
   * 3. Allow editing brand guidelines:
   *    - PUT /api/admin/offers/:id/brand-guidelines
   *    - Request body: {
   *        type: "url" | "file" | "text",
   *        url?: string,
   *        file?: File,
   *        content?: string
   *      }
   *    - For file uploads: Use multipart/form-data
   *    - Validate file size (max 10MB) and type (DOCX, PDF)
   *    - If replacing existing file, delete old file from storage
   *
   * 4. Error Handling:
   *    - 404: Offer or brand guidelines not found
   *    - 400: Invalid file type/size or validation errors
   *    - 413: File too large - show specific error message
   *    - 500: Server error or file storage error
   *
   * 5. Success:
   *    - Close modal
   *    - Show success notification
   *    - Optionally refresh offer data
   */
  const handleBrandGuidelines = (_id: string) => {
    // TODO: Implement API call to fetch brand guidelines
    // TODO: Open brand guidelines viewer/modal
    // TODO: Handle editing and file uploads
  };

  /**
   * TODO: BACKEND - Implement Visibility Change Handler
   *
   * Endpoint: PATCH /api/admin/offers/:id/visibility
   *
   * Requirements:
   * 1. Update offer visibility immediately:
   *    - Request body: { visibility: "Public" | "Internal" | "Hidden" }
   *    - Optimistically update UI (currently done)
   *    - Call API to persist change
   *
   * 2. Response:
   *    - Return updated offer object with new visibility
   *    - Include updatedAt timestamp
   *    - Return full offer object for consistency
   *
   * 3. Error Handling:
   *    - 404: Offer not found - revert optimistic update, show error
   *    - 400: Invalid visibility value - revert optimistic update, show error
   *    - 401: Unauthorized - revert optimistic update, redirect to login
   *    - 403: Forbidden - revert optimistic update, show permission denied
   *    - 500: Server error - revert optimistic update, show error with retry
   *    - On error: Revert optimistic update and show error message
   *
   * 4. Success:
   *    - Update local state with server response
   *    - Show success notification (optional, can be subtle)
   *    - Optionally refresh offers list to ensure consistency
   *
   * 5. Optimistic Update Strategy:
   *    - Current implementation updates UI immediately
   *    - Keep this behavior but add API call
   *    - Revert on error
   *    - Consider debouncing if user changes visibility rapidly
   */
  const handleVisibilityChange = (
    id: string,
    visibility: "Public" | "Internal" | "Hidden"
  ) => {
    // Optimistic update (keep this)
    setOffersVisibility((prev) => ({
      ...prev,
      [id]: visibility,
    }));

    // TODO: Call API: PATCH /api/admin/offers/:id/visibility
    // TODO: Handle error and revert optimistic update if failed
    // TODO: Show success/error notification
  };

  const clearAllFilters = () => {
    setStatusFilter(null);
    setVisibilityFilter(null);
    setCreationMethodFilter(null);
    setSortByFilter(null);
    setIsFilterOpen(false);
    setActiveCategory(null);
  };

  const hasActiveFilters =
    statusFilter !== null ||
    visibilityFilter !== null ||
    creationMethodFilter !== null ||
    sortByFilter !== null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading offers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No offers available</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)] hover:bg-transparent hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.15)] transition-shadow duration-200"
            style={{
              color: variables.colors.buttonOutlineTextColor,
              borderColor: variables.colors.buttonOutlineBorderColor,
              backgroundColor: variables.colors.cardBackground,
            }}
            onClick={() => setIsNewOfferModalOpen(true)}
          >
            <Plus className="h-5 w-5" />
            Create New Manually
          </Button>

          <Button
            variant="outline"
            className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.15)] transition-shadow duration-200"
            style={{
              color: variables.colors.buttonOutlineTextColor,
              borderColor: variables.colors.buttonOutlineBorderColor,
              backgroundColor: variables.colors.cardBackground,
            }}
          >
            <Edit className="h-5 w-5" />
            Bulk Edit
          </Button>

          {/* 
            TODO: BACKEND - Implement Pull Via API Functionality
            
            Endpoint: POST /api/admin/offers/pull-from-api
            
            Requirements:
            1. Trigger synchronization with external API to fetch new/updated offers
               - Connect to external offer API (configure API credentials/endpoint)
               - Fetch offers from external source
               - Compare with existing offers (by offerId or external ID)
               - Create new offers that don't exist
               - Update existing offers that have changed
               - Handle conflicts (e.g., manual edits vs API updates)
            
            2. Request body (optional):
               {
                 source?: string, // API source identifier if multiple sources
                 force?: boolean, // Force full sync vs incremental
                 filters?: { // Optional filters for what to pull
                   advertiserIds?: string[],
                   dateRange?: { from: string, to: string },
                   status?: "Active" | "Inactive"
                 }
               }
            
            3. Response:
               {
                 success: boolean,
                 synced: number,      // Number of offers synced
                 created: number,     // Number of new offers created
                 updated: number,     // Number of existing offers updated
                 skipped: number,     // Number of offers skipped (no changes)
                 errors: Array<{      // Any errors encountered
                   offerId?: string,
                   error: string,
                   reason: string
                 }>,
                 duration: number     // Sync duration in milliseconds
               }
            
            4. Process Flow:
               - Show loading state with progress indicator
               - Display real-time sync progress if possible (WebSocket/SSE)
               - Show success notification with statistics
               - Refresh offers list after completion
               - Display any errors/warnings
            
            5. Error Handling:
               - 400: Invalid request parameters - show validation errors
               - 401: Unauthorized (API credentials invalid) - show error, link to settings
               - 403: Forbidden (no permission to sync) - show permission denied
               - 408: Request timeout (sync taking too long) - show timeout, offer retry
               - 500: Server error or external API error - show error with retry
               - 503: External API unavailable - show error, suggest retry later
            
            6. Background Processing:
               - Consider making this an async job if sync takes long (>30 seconds)
               - Provide job status endpoint: GET /api/admin/offers/sync-status/:jobId
               - Allow user to check progress and cancel if needed
               - Show job status in UI (progress bar, estimated time remaining)
            
            7. Configuration:
               - Store API credentials securely (encrypted)
               - Allow admin to configure sync schedule (auto-sync)
               - Log all sync operations for audit
               - Store sync history (last sync time, results, errors)
            
            8. Conflict Resolution:
               - Define strategy for handling conflicts
               - Options: API wins, Manual wins, or prompt user
               - Log all conflicts for review
          */}
          <Button
            variant="outline"
            className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.15)] transition-shadow duration-200"
            style={{
              color: variables.colors.buttonOutlineTextColor,
              borderColor: variables.colors.buttonOutlineBorderColor,
              backgroundColor: variables.colors.cardBackground,
            }}
            onClick={() => {
              // TODO: Implement API pull functionality
              // TODO: Show loading/progress indicator
              // TODO: Call POST /api/admin/offers/pull-from-api
              // TODO: Handle response and refresh offers list
              // TODO: Show success/error notification with statistics
            }}
          >
            <Download className="h-5 w-5" />
            Pull Via API
          </Button>

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
                  borderColor: variables.colors.buttonOutlineBorderColor,
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
                    onClick={() => setActiveCategory("visibility")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                      activeCategory === "visibility"
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Visibility</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setActiveCategory("creationMethod")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                      activeCategory === "creationMethod"
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Creation Method</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setActiveCategory("sortBy")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                      activeCategory === "sortBy"
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Sort By</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                {activeCategory && (
                  <div className="w-1/2 p-3">
                    {activeCategory === "status" && (
                      <div className="space-y-1">
                        {["Active", "Inactive"].map((status) => (
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

                    {activeCategory === "visibility" && (
                      <div className="space-y-1">
                        {["Public", "Internal", "Hidden"].map((visibility) => (
                          <button
                            key={visibility}
                            onClick={() => {
                              setVisibilityFilter(
                                visibility as VisibilityFilter
                              );
                              setIsFilterOpen(false);
                              setActiveCategory(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                              visibilityFilter === visibility
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {visibility}
                          </button>
                        ))}
                      </div>
                    )}

                    {activeCategory === "creationMethod" && (
                      <div className="space-y-1">
                        {["Manually", "API"].map((method) => (
                          <button
                            key={method}
                            onClick={() => {
                              setCreationMethodFilter(
                                method as CreationMethodFilter
                              );
                              setIsFilterOpen(false);
                              setActiveCategory(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                              creationMethodFilter === method
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    )}

                    {activeCategory === "sortBy" && (
                      <div className="space-y-1">
                        {["New to Old", "Old to New"].map((sort) => (
                          <button
                            key={sort}
                            onClick={() => {
                              setSortByFilter(sort as SortByFilter);
                              setIsFilterOpen(false);
                              setActiveCategory(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                              sortByFilter === sort
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {sort}
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

        <div className="relative w-full sm:w-100">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
            style={{ color: variables.colors.inputPlaceholderColor }}
          />
          <Input
            type="text"
            placeholder="Search by Offer Name / ID / Advertiser Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 font-inter"
            style={{
              backgroundColor: variables.colors.inputBackgroundColor,
              borderColor: variables.colors.inputBorderColor,
              color: variables.colors.inputTextColor,
            }}
          />
        </div>
      </div>

      <EntityDataTable
        data={filteredOffers}
        columns={columns}
        renderRow={(offer: OfferType, index: number) => (
          <EntityDataCard
            id={offer.id}
            name={offer.offerName}
            advName={offer.advName}
            createdMethod={offer.createdMethod}
            status={offer.status}
            visibility={offer.visibility}
            variant={index % 2 === 0 ? "purple" : "blue"}
            gridTemplateColumns={columns
              .map((col) => col.width || "1fr")
              .join(" ")}
            onEditDetails={() => handleEditDetails(offer.id)}
            onBrandGuidelines={() => handleBrandGuidelines(offer.id)}
            onVisibilityChange={(visibility) =>
              handleVisibilityChange(offer.id, visibility)
            }
          />
        )}
      />

      <NewOfferManuallyModal
        open={isNewOfferModalOpen}
        onOpenChange={setIsNewOfferModalOpen}
        onSuccess={() => {
          setIsNewOfferModalOpen(false);
        }}
      />
    </div>
  );
}
