"use client";

/**
 * TODO: BACKEND - Publisher Component Backend Integration
 *
 * This component currently uses client-side filtering, sorting, and mock data.
 * For production, consider the following backend integrations:
 *
 * 1. Server-Side Filtering & Sorting:
 *    - Move filtering logic to backend for better performance with large datasets
 *    - Endpoint: GET /api/admin/publishers with query parameters
 *    - Query params: status, platform, creationMethod, search, sortBy, sortOrder
 *    - Benefits: Reduced client-side processing, pagination support
 *
 * 2. Real-Time Updates:
 *    - Consider WebSocket/SSE for real-time publisher updates
 *    - Notify when publishers are created/updated/deleted by other users
 *    - Auto-refresh publishers list when changes occur
 *
 * 3. Pagination:
 *    - Implement server-side pagination for large publisher lists
 *    - Add pagination controls (page numbers, items per page)
 *    - Endpoint should return: { data: Publisher[], pagination: { page, limit, total, totalPages } }
 *
 * 4. Search Optimization:
 *    - Consider full-text search on backend for better performance
 *    - Support advanced search (filters combined with search)
 *    - Add search suggestions/autocomplete
 *
 * 5. Caching Strategy:
 *    - Implement caching for frequently accessed publishers
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

import { ChevronRight, ListFilter, Plus, Search, X } from "lucide-react";
import { useState } from "react";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { managePublishers } from "../models/publisher.model";
import type { Publisher as PublisherType } from "../types/admin.types";
import { usePublisherViewModel } from "../view-models/usePublisherViewModel";

import { BrandGuidelinesModal } from "./BrandGuidelinesModal";
import { EntityDataTable, EntityDataCard } from "./EntityDataTable";

type StatusFilter = "Active" | "Inactive" | null;
type PlatformFilter =
  | "Cake"
  | "HasOffers"
  | "Tune"
  | "Impact"
  | "Everflow"
  | null;
type CreationMethodFilter = "Manually" | "API" | null;
type SortByFilter = "New to Old" | "Old to New" | null;
type FilterCategory =
  | "status"
  | "platform"
  | "creationMethod"
  | "sortBy"
  | null;

export function Publisher() {
  const variables = getVariables();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(null);
  const [creationMethodFilter, setCreationMethodFilter] =
    useState<CreationMethodFilter>(null);
  const [sortByFilter, setSortByFilter] = useState<SortByFilter>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>(null);
  const [brandGuidelinesModalOpen, setBrandGuidelinesModalOpen] =
    useState(false);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(
    null
  );
  const [selectedPublisherName, setSelectedPublisherName] =
    useState<string>("");

  const { publishers, isLoading, error } = usePublisherViewModel();

  const columns = [
    { header: "ID", width: "100px" },
    { header: "Publisher Name", width: "1.2fr" },
    { header: "Advertiser Platform", width: "1.2fr" },
    { header: "Created Manually / via API", width: "1.2fr" },
    { header: "Status", width: "140px" },
    { header: "Actions", width: "340px" },
  ];

  const filteredPublishers = managePublishers
    .filter((publisher) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        publisher.id.toLowerCase().includes(query) ||
        publisher.publisherName.toLowerCase().includes(query) ||
        publisher.pubPlatform.toLowerCase().includes(query);

      const matchesStatus = !statusFilter || publisher.status === statusFilter;
      const matchesPlatform =
        !platformFilter || publisher.pubPlatform === platformFilter;
      const matchesCreationMethod =
        !creationMethodFilter ||
        publisher.createdMethod === creationMethodFilter;

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
    });

  /**
   * TODO: BACKEND - Implement Edit Publisher Details Handler
   *
   * Endpoint: GET /api/admin/publishers/:id
   *
   * Requirements:
   * 1. Fetch full publisher details by ID including:
   *    - All publisher fields (publisherName, platform, status, etc.)
   *    - Brand guidelines (URL, file, or text content)
   *    - Creation metadata (createdAt, createdBy, updatedAt, etc.)
   *
   * 2. Open a modal/form with pre-filled data for editing
   *    - Pre-populate all form fields with fetched data
   *    - Handle brand guidelines based on type (url/file/text)
   *
   * 3. On save, call: PUT /api/admin/publishers/:id
   *    - Request body: {
   *        publisherName: string,
   *        platform: string,
   *        status: "Active" | "Inactive",
   *        brandGuidelines?: {
   *          type: "url" | "file" | "text",
   *          url?: string,
   *          file?: File,
   *          text?: string
   *        }
   *      }
   *    - Validate all required fields
   *    - Return updated publisher object
   *
   * 4. Error Handling:
   *    - 404: Publisher not found - show error message
   *    - 400: Validation errors - show field-specific errors in form
   *    - 401: Unauthorized - redirect to login
   *    - 403: Forbidden - show permission denied message
   *    - 500: Server error - show generic error with retry option
   *
   * 5. Success:
   *    - Close edit modal
   *    - Refresh publishers list
   *    - Show success notification
   *    - Update local state if needed
   */
  const handleEditDetails = (_id: string) => {
    // TODO: BACKEND - Implement edit publisher details functionality
    // 1. Fetch publisher details: GET /api/admin/publishers/:id
    // 2. Open edit modal with pre-filled data
    // 3. On save: PUT /api/admin/publishers/:id
    // 4. Handle success/error and refresh list
  };

  const handleBrandGuidelines = (id: string) => {
    const publisher = publishers?.find((p) => p.id === id);
    setSelectedPublisherId(id);
    setSelectedPublisherName(publisher?.publisherName || "");
    setBrandGuidelinesModalOpen(true);
  };

  const clearAllFilters = () => {
    setStatusFilter(null);
    setPlatformFilter(null);
    setCreationMethodFilter(null);
    setSortByFilter(null);
    setIsFilterOpen(false);
    setActiveCategory(null);
  };

  const hasActiveFilters =
    statusFilter !== null ||
    platformFilter !== null ||
    creationMethodFilter !== null ||
    sortByFilter !== null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading publishers...</div>
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

  if (!publishers || publishers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No publishers available</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)] hover:bg-transparent"
            style={{
              color: variables.colors.buttonOutlineTextColor,
              borderColor: variables.colors.buttonOutlineBorderColor,
              backgroundColor: variables.colors.cardBackground,
            }}
          >
            <Plus className="h-5 w-5" />
            Create New Manually
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
                className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)]"
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
                    onClick={() => setActiveCategory("platform")}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                      activeCategory === "platform"
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Platform</span>
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

                    {activeCategory === "platform" && (
                      <div className="space-y-1">
                        {[
                          "Cake",
                          "HasOffers",
                          "Tune",
                          "Impact",
                          "Everflow",
                        ].map((platform) => (
                          <button
                            key={platform}
                            onClick={() => {
                              setPlatformFilter(platform as PlatformFilter);
                              setIsFilterOpen(false);
                              setActiveCategory(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                              platformFilter === platform
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {platform}
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
            placeholder="Search by Publisher Name / ID / Platform"
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
        data={filteredPublishers}
        columns={columns}
        renderRow={(publisher: PublisherType, index: number) => (
          <EntityDataCard
            id={publisher.id}
            name={publisher.publisherName}
            platform={publisher.pubPlatform}
            createdMethod={publisher.createdMethod}
            status={publisher.status}
            variant={index % 2 === 0 ? "purple" : "blue"}
            onEditDetails={() => handleEditDetails(publisher.id)}
            onBrandGuidelines={() => handleBrandGuidelines(publisher.id)}
          />
        )}
      />

      {selectedPublisherId && (
        <BrandGuidelinesModal
          open={brandGuidelinesModalOpen}
          onOpenChange={setBrandGuidelinesModalOpen}
          entityId={selectedPublisherId}
          entityName={selectedPublisherName}
          entityType="publisher"
        />
      )}
    </div>
  );
}
