"use client";

import {
  ChevronRight,
  Download,
  ListFilter,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useMemo, useCallback, useState, useEffect } from "react";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { EntityDataTable, EntityDataCard } from "@/features/dashboard";

import { manageAdvertisers } from "../models/advertiser.model";
import type { Advertiser as AdvertiserType } from "../types/admin.types";
import { useAdvertiserViewModel } from "../view-models/useAdvertiserViewModel";


import { AdvertiserDetailsModal } from "./AdvertiserDetailsModal";
import { BrandGuidelinesModal } from "./BrandGuidelinesModal";
import { NewAdvertiserManuallyModal } from "./NewAdvertiserManuallyModal";

type StatusFilter = "Active" | "Inactive" | null;
type PlatformFilter = "Everflow" | null;
type CreationMethodFilter = "Manually" | "API" | null;
type SortByFilter = "New to Old" | "Old to New" | null;
type FilterCategory =
  | "status"
  | "platform"
  | "creationMethod"
  | "sortBy"
  | null;

export function Advertiser() {
  const variables = getVariables();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(null);
  const [creationMethodFilter, setCreationMethodFilter] =
    useState<CreationMethodFilter>(null);
  const [sortByFilter, setSortByFilter] = useState<SortByFilter>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>(null);
  const [isPullingViaAPI, setIsPullingViaAPI] = useState(false);
  const [brandGuidelinesModalOpen, setBrandGuidelinesModalOpen] =
    useState(false);
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<
    string | null
  >(null);
  const [selectedAdvertiserName, setSelectedAdvertiserName] =
    useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isNewAdvertiserModalOpen, setIsNewAdvertiserModalOpen] =
    useState(false);
  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);
  const [selectedAdvertiserIdForEdit, setSelectedAdvertiserIdForEdit] =
    useState<string | null>(null);

  const { advertisers, isLoading, error } = useAdvertiserViewModel();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const columns = useMemo(
    () => [
      { header: "ID", width: "100px" },
      { header: "Advertiser Name", width: "1.8fr", align: "center" as const },
      { header: "Advertiser Platform", width: "1fr" },
      { header: "Created Manually / via API", width: "1.2fr" },
      { header: "Status", width: "1fr" },
      { header: "Actions", width: "1.8fr" },
    ],
    []
  );

  const filteredAdvertisers = useMemo(
    () =>
      manageAdvertisers
        .filter((advertiser) => {
          const query = debouncedSearchQuery.toLowerCase();
          const matchesSearch =
            advertiser.id.toLowerCase().includes(query) ||
            advertiser.advertiserName.toLowerCase().includes(query) ||
            advertiser.advPlatform.toLowerCase().includes(query);

          const matchesStatus =
            !statusFilter || advertiser.status === statusFilter;
          const matchesPlatform =
            !platformFilter || advertiser.advPlatform === platformFilter;
          const matchesCreationMethod =
            !creationMethodFilter ||
            advertiser.createdMethod === creationMethodFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPlatform &&
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
        }),
    [
      debouncedSearchQuery,
      statusFilter,
      platformFilter,
      creationMethodFilter,
      sortByFilter,
    ]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchQuery,
    statusFilter,
    platformFilter,
    creationMethodFilter,
    sortByFilter,
  ]);

  const totalPages = useMemo(
    () => Math.ceil(filteredAdvertisers.length / itemsPerPage),
    [filteredAdvertisers.length, itemsPerPage]
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAdvertisers = useMemo(
    () => filteredAdvertisers.slice(startIndex, endIndex),
    [filteredAdvertisers, startIndex, endIndex]
  );

  const getPageNumbers = useCallback(() => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  /**
   * TODO: BACKEND - Edit Advertiser Details Handler
   *
   * This function opens the edit modal for an advertiser.
   *
   * Current Implementation:
   * - Opens AdvertiserDetailsModal with the selected advertiser ID
   * - Modal fetches advertiser details via getAdvertiserById
   *
   * Backend Requirements:
   * - Ensure GET /api/admin/advertisers/:id endpoint exists
   * - Return full advertiser details including:
   *   - All advertiser fields (id, advertiserName, advPlatform, status, createdMethod)
   *   - Creation metadata (createdAt, createdBy, updatedAt, updatedBy)
   *   - Any additional fields needed for editing
   *
   * Error Handling:
   * - 404: Advertiser not found - show error in modal
   * - 401: Unauthorized - redirect to login
   * - 403: Forbidden - show permission denied
   * - 500: Server error - show error with retry option
   */
  const handleEditDetails = useCallback((id: string) => {
    setSelectedAdvertiserIdForEdit(id);
    setIsEditDetailsModalOpen(true);
  }, []);

  /**
   * TODO: BACKEND - Brand Guidelines Handler
   *
   * This function opens the brand guidelines modal for an advertiser.
   *
   * Endpoint: GET /api/admin/advertisers/:id/brand-guidelines
   *
   * Requirements:
   * 1. Fetch brand guidelines for the advertiser:
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
   *    - PUT /api/admin/advertisers/:id/brand-guidelines
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
   *    - 404: Advertiser or brand guidelines not found
   *    - 400: Invalid file type/size or validation errors
   *    - 413: File too large - show specific error message
   *    - 500: Server error or file storage error
   *
   * 5. Success:
   *    - Close modal
   *    - Show success notification
   *    - Optionally refresh advertiser data
   */
  const handleBrandGuidelines = useCallback(
    (id: string) => {
      const advertiser = advertisers?.find((a) => a.id === id);
      setSelectedAdvertiserId(id);
      setSelectedAdvertiserName(advertiser?.advertiserName || "");
      setBrandGuidelinesModalOpen(true);
    },
    [advertisers]
  );

  /**
   * TODO: BACKEND - Implement Pull Via API Functionality for Advertisers
   *
   * Endpoint: POST /api/admin/advertisers/pull-from-api
   *
   * Requirements:
   * 1. Trigger synchronization with external API to fetch new/updated advertisers
   *    - Connect to external advertiser API (configure API credentials/endpoint)
   *    - Fetch advertisers from external source
   *    - Compare with existing advertisers (by advertiserId or external ID)
   *    - Create new advertisers that don't exist
   *    - Update existing advertisers that have changed
   *    - Handle conflicts (e.g., manual edits vs API updates)
   *
   * 2. Request body (optional):
   *    {
   *      source?: string,                    // API source identifier if multiple sources
   *      force?: boolean,                     // Force full sync vs incremental
   *      filters?: {                          // Optional filters for what to pull
   *        advertiserIds?: string[],
   *        dateRange?: { from: string, to: string },
   *        status?: "Active" | "Inactive"
   *      }
   *    }
   *
   * 3. Response:
   *    {
   *      success: boolean,
   *      synced: number,                      // Number of advertisers synced
   *      created: number,                     // Number of new advertisers created
   *      updated: number,                     // Number of existing advertisers updated
   *      skipped: number,                     // Number of advertisers skipped (no changes)
   *      errors: Array<{                      // Any errors encountered
   *        advertiserId?: string,
   *        error: string,
   *        reason: string
   *      }>,
   *      duration: number                     // Sync duration in milliseconds
   *    }
   *
   * 4. Process Flow:
   *    - Show loading state with progress indicator
   *    - Display real-time sync progress if possible (WebSocket/SSE)
   *    - Show success notification with statistics
   *    - Refresh advertisers list after completion
   *    - Display any errors/warnings
   *
   * 5. Error Handling:
   *    - 400: Invalid request parameters - show validation errors
   *    - 401: Unauthorized (API credentials invalid) - show error, link to settings
   *    - 403: Forbidden (no permission to sync) - show permission denied
   *    - 408: Request timeout (sync taking too long) - show timeout, offer retry
   *    - 500: Server error or external API error - show error with retry
   *    - 503: External API unavailable - show error, suggest retry later
   *
   * 6. Background Processing:
   *    - Consider making this an async job if sync takes long (>30 seconds)
   *    - Provide job status endpoint: GET /api/admin/advertisers/sync-status/:jobId
   *    - Allow user to check progress and cancel if needed
   *    - Show job status in UI (progress bar, estimated time remaining)
   *
   * 7. Configuration:
   *    - Store API credentials securely (encrypted)
   *    - Allow admin to configure sync schedule (auto-sync)
   *    - Log all sync operations for audit
   *    - Store sync history (last sync time, results, errors)
   *
   * 8. Conflict Resolution:
   *    - Define strategy for handling conflicts
   *    - Options: API wins, Manual wins, or prompt user
   *    - Log all conflicts for review
   */
  const handlePullViaAPI = async () => {
    setIsPullingViaAPI(true);
    try {
      // TODO: BACKEND - Replace with actual API call
      // const response = await fetch('/api/admin/advertisers/pull-from-api', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${getAuthToken()}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({})
      // });
      //
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.message || 'Failed to pull advertisers from API');
      // }
      //
      // const result = await response.json();
      // Show success notification with statistics
      // Refresh advertisers list

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Failed to pull advertisers via API:", error);
    } finally {
      setIsPullingViaAPI(false);
    }
  };

  const clearAllFilters = useCallback(() => {
    setStatusFilter(null);
    setPlatformFilter(null);
    setCreationMethodFilter(null);
    setSortByFilter(null);
    setIsFilterOpen(false);
    setActiveCategory(null);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters =
    statusFilter !== null ||
    platformFilter !== null ||
    creationMethodFilter !== null ||
    sortByFilter !== null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)] hover:bg-transparent hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.15)] transition-shadow duration-200"
            style={{
              color: variables.colors.buttonOutlineTextColor,
              borderColor: variables.colors.buttonOutlineBorderColor,
              backgroundColor: variables.colors.cardBackground,
            }}
            onClick={() => setIsNewAdvertiserModalOpen(true)}
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
            onClick={handlePullViaAPI}
            disabled={isPullingViaAPI}
          >
            {isPullingViaAPI ? (
              <>
                <Spinner className="h-5 w-5" />
                Pulling...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Pull Via API
              </>
            )}
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
                    <div className="flex items-center gap-2">
                      {statusFilter !== null && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusFilter(null);
                          }}
                          className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                          title="Clear Status"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setStatusFilter(null);
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
                    onClick={() => setActiveCategory("platform")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                      activeCategory === "platform"
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Platform</span>
                    <div className="flex items-center gap-2">
                      {platformFilter !== null && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlatformFilter(null);
                          }}
                          className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                          title="Clear Platform"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setPlatformFilter(null);
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
                    onClick={() => setActiveCategory("creationMethod")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                      activeCategory === "creationMethod"
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Creation Method</span>
                    <div className="flex items-center gap-2">
                      {creationMethodFilter !== null && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreationMethodFilter(null);
                          }}
                          className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                          title="Clear Creation Method"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setCreationMethodFilter(null);
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

                    {activeCategory === "platform" && (
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setPlatformFilter("Everflow");
                            setIsFilterOpen(false);
                            setActiveCategory(null);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                            platformFilter === "Everflow"
                              ? "bg-gray-100 text-gray-900 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          Everflow
                        </button>
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
            placeholder="Search by Advertiser Name / ID / Platform"
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

      {isLoading ? (
        <div className="w-full">
          <div className="rounded-t-2xl px-5 py-4 border-b">
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: "100px 1.8fr 1fr 1.2fr 1fr 1.8fr",
                gap: "1.5rem",
              }}
            >
              {columns.map((_, index) => (
                <Skeleton key={index} className="h-4 w-20" />
              ))}
            </div>
          </div>
          <div className="space-y-3 mt-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <div className="text-destructive">Error: {error}</div>
        </div>
      ) : !advertisers || advertisers.length === 0 ? (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <div className="text-muted-foreground">No advertisers available</div>
        </div>
      ) : (
        <EntityDataTable
          data={paginatedAdvertisers}
          columns={columns}
          renderRow={(advertiser: AdvertiserType, index: number) => (
            <EntityDataCard
              id={advertiser.id}
              name={advertiser.advertiserName}
              platform={advertiser.advPlatform}
              createdMethod={advertiser.createdMethod}
              status={advertiser.status}
              variant={index % 2 === 0 ? "purple" : "blue"}
              nameAlign="center"
              gridTemplateColumns={columns
                .map((col) => col.width || "1fr")
                .join(" ")}
              actionButtonsLayout="row"
              onEditDetails={() => handleEditDetails(advertiser.id)}
              onBrandGuidelines={() => handleBrandGuidelines(advertiser.id)}
            />
          )}
        />
      )}

      {!isLoading &&
        !error &&
        advertisers &&
        advertisers.length > 0 &&
        totalPages > 1 && (
          <div
            className="flex items-center gap-4 mt-6 pt-6 border-t"
            style={{ borderColor: variables.colors.inputBorderColor }}
          >
            <div
              className="text-sm font-inter whitespace-nowrap"
              style={{ color: variables.colors.descriptionColor }}
            >
              Showing{" "}
              <span
                className="font-medium"
                style={{ color: variables.colors.inputTextColor }}
              >
                {startIndex + 1}
              </span>{" "}
              to{" "}
              <span
                className="font-medium"
                style={{ color: variables.colors.inputTextColor }}
              >
                {Math.min(endIndex, filteredAdvertisers.length)}
              </span>{" "}
              of{" "}
              <span
                className="font-medium"
                style={{ color: variables.colors.inputTextColor }}
              >
                {filteredAdvertisers.length}
              </span>{" "}
              advertisers
            </div>
            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        setCurrentPage((prev) => prev - 1);
                      }
                    }}
                    className={`transition-all duration-200 ${
                      currentPage === 1
                        ? "pointer-events-none opacity-40 cursor-not-allowed"
                        : "cursor-pointer hover:bg-gray-100"
                    }`}
                    style={{
                      color:
                        currentPage === 1
                          ? variables.colors.descriptionColor
                          : variables.colors.inputTextColor,
                    }}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis className="text-gray-400" />
                    ) : (
                      <PaginationLink
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={currentPage === page}
                        className={`transition-all duration-200 min-w-9 h-9 flex items-center justify-center font-inter text-sm ${
                          currentPage === page
                            ? "cursor-default"
                            : "cursor-pointer hover:bg-gray-100"
                        }`}
                        style={{
                          backgroundColor:
                            currentPage === page
                              ? variables.colors.buttonDefaultBackgroundColor
                              : "transparent",
                          color:
                            currentPage === page
                              ? variables.colors.buttonDefaultTextColor
                              : variables.colors.inputTextColor,
                          borderColor:
                            currentPage === page
                              ? variables.colors.buttonDefaultBackgroundColor
                              : variables.colors.inputBorderColor,
                        }}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        setCurrentPage((prev) => prev + 1);
                      }
                    }}
                    className={`transition-all duration-200 ${
                      currentPage === totalPages
                        ? "pointer-events-none opacity-40 cursor-not-allowed"
                        : "cursor-pointer hover:bg-gray-100"
                    }`}
                    style={{
                      color:
                        currentPage === totalPages
                          ? variables.colors.descriptionColor
                          : variables.colors.inputTextColor,
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-inter whitespace-nowrap"
                style={{ color: variables.colors.descriptionColor }}
              >
                Show:
              </span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="h-8 w-20 text-xs font-inter border rounded-md"
                  style={{
                    backgroundColor: variables.colors.inputBackgroundColor,
                    borderColor: variables.colors.inputBorderColor,
                    color: variables.colors.inputTextColor,
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

      {selectedAdvertiserId && (
        <BrandGuidelinesModal
          open={brandGuidelinesModalOpen}
          onOpenChange={setBrandGuidelinesModalOpen}
          entityId={selectedAdvertiserId}
          entityName={selectedAdvertiserName}
          entityType="advertiser"
        />
      )}

      <NewAdvertiserManuallyModal
        open={isNewAdvertiserModalOpen}
        onOpenChange={setIsNewAdvertiserModalOpen}
        onSuccess={() => {
          setIsNewAdvertiserModalOpen(false);
          /**
           * TODO: BACKEND - Refresh Advertisers List After Creation
           *
           * After successfully creating a new advertiser, refresh the list:
           * 1. Call getAllAdvertisers() to fetch updated list
           * 2. Update the advertisers state
           * 3. Reset filters if needed
           * 4. Show success notification
           * 5. Optionally navigate to the newly created advertiser
           *
           * Implementation:
           * ```typescript
           * try {
           *   const updatedAdvertisers = await getAllAdvertisers();
           *   setAdvertisers(updatedAdvertisers);
           *   // Show success toast
           * } catch (error) {
           *   // Handle error
           * }
           * ```
           */
        }}
      />

      {selectedAdvertiserIdForEdit && (
        <AdvertiserDetailsModal
          open={isEditDetailsModalOpen}
          onOpenChange={setIsEditDetailsModalOpen}
          advertiserId={selectedAdvertiserIdForEdit}
          onSuccess={() => {
            setIsEditDetailsModalOpen(false);
            setSelectedAdvertiserIdForEdit(null);
            /**
             * TODO: BACKEND - Refresh Advertisers List After Update
             *
             * After successfully updating an advertiser, refresh the list:
             * 1. Call getAllAdvertisers() to fetch updated list
             * 2. Update the advertisers state
             * 3. Maintain current filters and pagination if possible
             * 4. Show success notification
             * 5. Optionally update only the specific advertiser in the list (optimistic update)
             *
             * Implementation:
             * ```typescript
             * try {
             *   const updatedAdvertisers = await getAllAdvertisers();
             *   setAdvertisers(updatedAdvertisers);
             *   // OR: Optimistically update only the changed advertiser
             *   // setAdvertisers(prev => prev.map(adv =>
             *   //   adv.id === updatedAdvertiser.id ? updatedAdvertiser : adv
             *   // ));
             *   // Show success toast
             * } catch (error) {
             *   // Handle error
             * }
             * ```
             */
          }}
        />
      )}
    </div>
  );
}
