/**
 * ManageRequestsPage - Admin's view of all creative requests
 *
 * UNIFIED MODEL EXPLANATION:
 *
 * This page shows creative requests from the ADMIN's perspective.
 * It displays the SAME creative requests in different states:
 *
 * TABS BREAKDOWN (ADMIN ACTIONS):
 * - All: Every creative request in the system
 * - New: Requests awaiting admin review (status='new', approvalStage='admin')
 * - Pending Approvals: Admin actions required - Requests with status='pending' and approvalStage='admin'
 *   where 2+ days have passed since submission date (admin needs to review/approve)
 * - Approved: Approved by admin (status='approved', approvalStage='admin') - Admin has approved these requests
 * - Rejected: Rejected by admin (status='rejected', approvalStage='admin')
 * - Sent Back: Advertiser returned for reconsideration (status='sent-back', approvalStage='admin')
 *   - Admin previously approved
 *   - Were forwarded to advertiser
 *   - Advertiser sent back for reconsideration
 *   - Now need admin to review again
 *
 * UNIFIED DATA MODEL:
 * This is NOT a separate "response" entity - it's the SAME creative request
 * that transitions through states. All tabs show the SAME unified data source,
 * just filtered by different status/approvalStage combinations for admin actions.
 */

"use client";

import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronRight,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";

import { getVariables } from "@/components/_variables/variables";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { RequestStatus } from "../types/request.types";
import { useManageRequestsViewModel } from "../view-models/useManageRequestsViewModel";

import { RequestSection } from "./RequestSection";

type TabValue = "all" | RequestStatus;
type SortOption =
  | "date-desc"
  | "date-asc"
  | "priority-high"
  | "priority-low"
  | "advertiser-asc"
  | "advertiser-desc";
type PriorityFilter = "all" | "high" | "medium";

export function ManageRequestsPage() {
  const variables = getVariables();
  const { requests, isLoading, error, refresh, updateRequestStatus } =
    useManageRequestsViewModel();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    "sortBy" | "priority" | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearchQuery, sortBy, priorityFilter]);

  const getPriorityValue = useCallback((priority: string): number => {
    const lowerPriority = priority?.toLowerCase() || "";
    if (lowerPriority.includes("high")) return 3;
    if (lowerPriority.includes("medium")) return 2;
    if (lowerPriority.includes("low")) return 1;
    return 0;
  }, []);

  const parseDate = useCallback((dateString: string): Date => {
    const months: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };

    const match = dateString.match(/(\d+)[a-z]*\s+(\w+)\s+(\d+)/i);
    if (match) {
      const day = parseInt(match[1]);
      const monthName = match[2].toLowerCase();
      const year = parseInt(match[3]);
      const month = months[monthName];

      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }

    return new Date(dateString);
  }, []);

  const searchInText = useCallback((text: string, query: string): boolean => {
    if (!text || !query) return false;
    return text.toLowerCase().includes(query.toLowerCase());
  }, []);

  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...requests];

    if (activeTab !== "all") {
      if (activeTab === "pending") {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        filtered = filtered.filter((request) => {
          if (
            request.status !== "pending" ||
            request.approvalStage?.toLowerCase() !== "admin"
          ) {
            return false;
          }

          const submissionDate = parseDate(request.date || "");
          submissionDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor(
            (now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          return daysDiff >= 2;
        });
      } else if (activeTab === "rejected") {
        filtered = filtered.filter(
          (request) =>
            request.status === "rejected" &&
            request.approvalStage?.toLowerCase() === "admin"
        );
      } else if (activeTab === "sent-back") {
        filtered = filtered.filter(
          (request) =>
            request.status === "sent-back" &&
            request.approvalStage?.toLowerCase() === "admin"
        );
      } else if (activeTab === "new") {
        filtered = filtered.filter(
          (request) =>
            request.status === "new" &&
            request.approvalStage?.toLowerCase() === "admin"
        );
      } else if (activeTab === "approved") {
        // Approved by admin (admin has approved, forwarded to advertiser)
        filtered = filtered.filter(
          (request) =>
            request.status === "approved" &&
            request.approvalStage?.toLowerCase() === "admin"
        );
      } else if (activeTab === "revised") {
        // Revised by publisher - resubmitted after being sent back
        filtered = filtered.filter(
          (request) =>
            request.status === "revised" &&
            request.approvalStage?.toLowerCase() === "admin"
        );
      } else {
        // Other statuses - filter by status
        filtered = filtered.filter((request) => request.status === activeTab);
      }
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((request) =>
        request.priority.toLowerCase().includes(priorityFilter.toLowerCase())
      );
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.trim();
      filtered = filtered.filter((request) => {
        return (
          searchInText(request.date || "", query) ||
          searchInText(request.advertiserName || "", query) ||
          searchInText(request.affiliateId || "", query) ||
          searchInText(request.priority || "", query) ||
          searchInText(request.offerId || "", query) ||
          searchInText(request.offerName || "", query) ||
          searchInText(request.clientId || "", query) ||
          searchInText(request.clientName || "", query) ||
          searchInText(request.creativeType || "", query) ||
          searchInText(request.status || "", query)
        );
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc": {
          const aDate = parseDate(a.date || "");
          const bDate = parseDate(b.date || "");
          const aTime = aDate.getTime();
          const bTime = bDate.getTime();
          // Handle invalid dates by putting them at the end
          if (isNaN(aTime) && isNaN(bTime)) return 0;
          if (isNaN(aTime)) return 1;
          if (isNaN(bTime)) return -1;
          return bTime - aTime;
        }
        case "date-asc": {
          const aDate = parseDate(a.date || "");
          const bDate = parseDate(b.date || "");
          const aTime = aDate.getTime();
          const bTime = bDate.getTime();
          // Handle invalid dates by putting them at the end
          if (isNaN(aTime) && isNaN(bTime)) return 0;
          if (isNaN(aTime)) return 1;
          if (isNaN(bTime)) return -1;
          return aTime - bTime;
        }
        case "priority-high": {
          const aPriority = getPriorityValue(a.priority || "");
          const bPriority = getPriorityValue(b.priority || "");
          if (bPriority !== aPriority) {
            return bPriority - aPriority;
          }
          return (
            parseDate(b.date || "").getTime() -
            parseDate(a.date || "").getTime()
          );
        }
        case "priority-low": {
          const aPriority = getPriorityValue(a.priority || "");
          const bPriority = getPriorityValue(b.priority || "");
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          return (
            parseDate(b.date || "").getTime() -
            parseDate(a.date || "").getTime()
          );
        }
        case "advertiser-asc": {
          return (a.advertiserName || "").localeCompare(
            b.advertiserName || "",
            undefined,
            { sensitivity: "base" }
          );
        }
        case "advertiser-desc": {
          return (b.advertiserName || "").localeCompare(
            a.advertiserName || "",
            undefined,
            { sensitivity: "base" }
          );
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    requests,
    activeTab,
    debouncedSearchQuery,
    sortBy,
    priorityFilter,
    getPriorityValue,
    parseDate,
    searchInText,
  ]);

  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredAndSortedRequests.slice(
    startIndex,
    endIndex
  );

  const getPageNumbers = () => {
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
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("date-desc");
    setPriorityFilter("all");
    setActiveTab("all");
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (sortBy !== "date-desc") count++;
    if (priorityFilter !== "all") count++;
    return count;
  }, [searchQuery, sortBy, priorityFilter]);

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
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
                  {activeFiltersCount > 0 && (
                    <span
                      className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor:
                          variables.colors.buttonDefaultBackgroundColor,
                        color: variables.colors.buttonDefaultTextColor,
                      }}
                    >
                      {activeFiltersCount}
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
                      onClick={() => setActiveCategory("sortBy")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                        activeCategory === "sortBy"
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>Sort By</span>
                      <div className="flex items-center gap-2">
                        {sortBy !== "date-desc" && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortBy("date-desc");
                            }}
                            className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                            title="Clear Sort By"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setSortBy("date-desc");
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
                      onClick={() => setActiveCategory("priority")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors ${
                        activeCategory === "priority"
                          ? "bg-gray-100 text-gray-900 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>Priority</span>
                      <div className="flex items-center gap-2">
                        {priorityFilter !== "all" && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setPriorityFilter("all");
                            }}
                            className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                            title="Clear Priority"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setPriorityFilter("all");
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
                      {activeCategory === "sortBy" && (
                        <div className="space-y-1">
                          {[
                            {
                              value: "date-desc",
                              label: "Newest First",
                              icon: ArrowDownAZ,
                            },
                            {
                              value: "date-asc",
                              label: "Oldest First",
                              icon: ArrowUpAZ,
                            },
                            {
                              value: "priority-high",
                              label: "Priority: High to Medium",
                              icon: ArrowDownAZ,
                            },
                            {
                              value: "priority-low",
                              label: "Priority: Medium to High",
                              icon: ArrowUpAZ,
                            },
                            {
                              value: "advertiser-asc",
                              label: "Advertiser: A-Z",
                              icon: ArrowDownAZ,
                            },
                            {
                              value: "advertiser-desc",
                              label: "Advertiser: Z-A",
                              icon: ArrowUpAZ,
                            },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                setSortBy(option.value as SortOption);
                                setIsFilterOpen(false);
                                setActiveCategory(null);
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                                sortBy === option.value
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <option.icon className="h-4 w-4" />
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {activeCategory === "priority" && (
                        <div className="space-y-1">
                          {["all", "high", "medium"].map((priority) => (
                            <button
                              key={priority}
                              onClick={() => {
                                setPriorityFilter(priority as PriorityFilter);
                                setIsFilterOpen(false);
                                setActiveCategory(null);
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors ${
                                priorityFilter === priority
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {priority === "all"
                                ? "All Priorities"
                                : priority === "high"
                                  ? "High Priority"
                                  : "Medium Priority"}
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
                      onClick={() => {
                        clearFilters();
                        setIsFilterOpen(false);
                        setActiveCategory(null);
                      }}
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

            <TabsList
              className="flex-1 grid grid-cols-7 h-auto p-1 gap-1"
              style={{ backgroundColor: variables.colors.inputBackgroundColor }}
            >
              <TabsTrigger
                value="all"
                className="h-10 px-2 rounded-md font-medium transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor:
                    activeTab === "all"
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "#FFFFFF",
                  color:
                    activeTab === "all"
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.inputTextColor,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "all") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "all") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="h-10 px-2 rounded-md font-medium transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor:
                    activeTab === "new"
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "#FFFFFF",
                  color:
                    activeTab === "new"
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.inputTextColor,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "new") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "new") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
              >
                New
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="h-10 px-2 rounded-md font-medium transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor:
                    activeTab === "pending"
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "#FFFFFF",
                  color:
                    activeTab === "pending"
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.inputTextColor,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "pending") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "pending") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="h-10 px-2 rounded-md font-medium transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor:
                    activeTab === "approved"
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "#FFFFFF",
                  color:
                    activeTab === "approved"
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.inputTextColor,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "approved") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "approved") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
              >
                Approved
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="h-10 px-2 rounded-md font-medium transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor:
                    activeTab === "rejected"
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "#FFFFFF",
                  color:
                    activeTab === "rejected"
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.inputTextColor,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "rejected") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "rejected") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
              >
                Rejected
              </TabsTrigger>
              <TabsTrigger
                value="sent-back"
                className="h-10 px-2 rounded-md font-medium transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor:
                    activeTab === "sent-back"
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "#FFFFFF",
                  color:
                    activeTab === "sent-back"
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.inputTextColor,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "sent-back") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "sent-back") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
              >
                Sent Back
              </TabsTrigger>
              <TabsTrigger
                value="revised"
                className="h-10 px-2 rounded-md font-medium transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor:
                    activeTab === "revised"
                      ? variables.colors.buttonDefaultBackgroundColor
                      : "#FFFFFF",
                  color:
                    activeTab === "revised"
                      ? variables.colors.buttonDefaultTextColor
                      : variables.colors.inputTextColor,
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== "revised") {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== "revised") {
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                  }
                }}
              >
                Revised
              </TabsTrigger>
            </TabsList>

            <div className="relative w-80">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: variables.colors.inputPlaceholderColor }}
              />
              <Input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 font-inter"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: variables.colors.inputBorderColor,
                  color: variables.colors.inputTextColor,
                }}
              />
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8 border rounded-lg">
              <div className="text-destructive">Error: {error}</div>
            </div>
          ) : filteredAndSortedRequests.length === 0 ? (
            <div className="flex items-center justify-center p-8 border rounded-lg">
              <div className="text-muted-foreground">
                No {activeTab === "all" ? "" : activeTab} requests available
              </div>
            </div>
          ) : (
            <>
              <RequestSection
                requests={paginatedRequests}
                startIndex={startIndex}
                onRefresh={refresh}
                onStatusUpdate={updateRequestStatus}
              />
              {totalPages > 1 && (
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
                      {Math.min(endIndex, filteredAndSortedRequests.length)}
                    </span>{" "}
                    of{" "}
                    <span
                      className="font-medium"
                      style={{ color: variables.colors.inputTextColor }}
                    >
                      {filteredAndSortedRequests.length}
                    </span>{" "}
                    requests
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
                                    ? variables.colors
                                        .buttonDefaultBackgroundColor
                                    : "transparent",
                                color:
                                  currentPage === page
                                    ? variables.colors.buttonDefaultTextColor
                                    : variables.colors.inputTextColor,
                                borderColor:
                                  currentPage === page
                                    ? variables.colors
                                        .buttonDefaultBackgroundColor
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
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
