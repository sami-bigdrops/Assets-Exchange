"use client";

import { ChevronRight, ListFilter, Plus, Search, X } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EntityDataTable,
  EntityDataCard,
} from "@/features/dashboard/components/EntityDataTable";

import type { Publisher as PublisherType } from "../types/publisher.types";
import { usePublisherViewModel } from "../view-models/usePublisherViewModel";

import { BrandGuidelinesModal } from "./BrandGuidelinesModal";
import { EditPublisherModal } from "./EditPublisherModal";

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { publishers, pagination, isLoading, error, load, refresh } = usePublisherViewModel();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data when filters change
  useEffect(() => {
    load({
      search: debouncedSearchQuery,
      status: statusFilter || undefined,
      platform: platformFilter || undefined,
      createdMethod: creationMethodFilter || undefined,
      sortBy: "createdAt",
      sortOrder: sortByFilter === "Old to New" ? "asc" : "desc",
      page: 1, // Reset to page 1 on filter change
      limit: pagination.limit
    });
  }, [debouncedSearchQuery, statusFilter, platformFilter, creationMethodFilter, sortByFilter, load]);

  // Handle page change
  const handlePageChange = (page: number) => {
    load({
      search: debouncedSearchQuery,
      status: statusFilter || undefined,
      platform: platformFilter || undefined,
      createdMethod: creationMethodFilter || undefined,
      sortBy: "createdAt",
      sortOrder: sortByFilter === "Old to New" ? "asc" : "desc",
      page,
      limit: pagination.limit
    });
  };

  // Handle limit change
  const handleLimitChange = (limitStr: string) => {
    const limit = parseInt(limitStr);
    load({
      search: debouncedSearchQuery,
      status: statusFilter || undefined,
      platform: platformFilter || undefined,
      createdMethod: creationMethodFilter || undefined,
      sortBy: "createdAt",
      sortOrder: sortByFilter === "Old to New" ? "asc" : "desc",
      page: 1,
      limit
    });
  };

  // Poll for real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const columns = [
    { header: "ID", width: "200px" },
    { header: "Publisher Name", width: "1.2fr" },
    { header: "Advertiser Platform", width: "1.2fr" },
    { header: "Created Manually / via API", width: "1.2fr" },
    { header: "Status", width: "140px" },
    { header: "Actions", width: "340px" },
  ];

  const handleEditDetails = (id: string) => {
    setSelectedPublisherId(id);
    setIsEditModalOpen(true);
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

  const getPageNumbers = useCallback(() => {
    const { page: currentPage, totalPages } = pagination;
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
  }, [pagination]);

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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${activeCategory === "status"
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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${activeCategory === "platform"
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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${activeCategory === "creationMethod"
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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${activeCategory === "sortBy"
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
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${statusFilter === status
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
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${platformFilter === platform
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
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${creationMethodFilter === method
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
                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${sortByFilter === sort
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

      {isLoading && publishers.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading publishers...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-destructive">Error: {error}</div>
        </div>
      ) : !publishers || publishers.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">No publishers found</div>
        </div>
      ) : (
        <>
          <EntityDataTable
            data={publishers}
            columns={columns}
            renderRow={(publisher: PublisherType, index: number) => (
              <EntityDataCard
                id={publisher.id}
                name={publisher.publisherName}
                platform={publisher.platform}
                createdMethod={publisher.createdMethod}
                status={publisher.status}
                variant={index % 2 === 0 ? "purple" : "blue"}
                onEditDetails={() => handleEditDetails(publisher.id)}
                onBrandGuidelines={() => handleBrandGuidelines(publisher.id)}
              />
            )}
          />

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
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
              </span>{" "}
              to{" "}
              <span
                className="font-medium"
                style={{ color: variables.colors.inputTextColor }}
              >
                 {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span
                className="font-medium"
                style={{ color: variables.colors.inputTextColor }}
              >
                {pagination.total}
              </span>{" "}
              publishers
            </div>
            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      if (pagination.page > 1) handlePageChange(pagination.page - 1);
                    }}
                    className={`transition-all duration-200 ${
                      pagination.page === 1
                        ? "pointer-events-none opacity-40 cursor-not-allowed"
                        : "cursor-pointer hover:bg-gray-100"
                    }`}
                    style={{
                      color:
                        pagination.page === 1
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
                          handlePageChange(page as number);
                        }}
                        isActive={pagination.page === page}
                        className={`transition-all duration-200 min-w-9 h-9 flex items-center justify-center font-inter text-sm ${
                          pagination.page === page
                            ? "cursor-default"
                            : "cursor-pointer hover:bg-gray-100"
                        }`}
                        style={{
                          backgroundColor:
                            pagination.page === page
                              ? variables.colors.buttonDefaultBackgroundColor
                              : "transparent",
                          color:
                            pagination.page === page
                              ? variables.colors.buttonDefaultTextColor
                              : variables.colors.inputTextColor,
                          borderColor:
                            pagination.page === page
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
                      if (pagination.page < pagination.totalPages) handlePageChange(pagination.page + 1);
                    }}
                    className={`transition-all duration-200 ${
                      pagination.page === pagination.totalPages
                        ? "pointer-events-none opacity-40 cursor-not-allowed"
                        : "cursor-pointer hover:bg-gray-100"
                    }`}
                    style={{
                      color:
                        pagination.page === pagination.totalPages
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
                value={pagination.limit.toString()}
                onValueChange={(value) => handleLimitChange(value)}
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
        </>
      )}

      {selectedPublisherId && isEditModalOpen && (
        <EditPublisherModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          publisherId={selectedPublisherId}
          onSuccess={() => {
            setIsEditModalOpen(false);
            refresh();
          }}
        />
      )}

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
