/**
 * ManageRequestsPage - Admin's view of all creative requests
 *
 * UNIFIED MODEL EXPLANATION:
 *
 * This page shows creative requests from the ADMIN's perspective.
 * It displays the SAME creative requests in different states:
 *
 * TABS BREAKDOWN:
 * - All: Every creative request in the system
 * - New: Requests awaiting admin review (status='new', approvalStage='admin')
 * - Pending Approvals: Forwarded to advertiser (status='pending', approvalStage='advertiser')
 * - Approved: Both admin & advertiser approved (status='approved', approvalStage='completed')
 * - Rejected: Rejected by either party
 * - Sent Back: Advertiser returned for reconsideration (status='sent-back', approvalStage='advertiser')
 *
 * KEY POINT: The "Sent Back" tab shows requests that:
 * - Admin previously approved
 * - Were forwarded to advertiser
 * - Advertiser sent back for reconsideration
 * - Now need admin to review again
 *
 * This is NOT a separate "response" entity - it's the SAME creative request
 * that has cycled back to admin for another review.
 */

"use client";

import { ArrowDownAZ, ArrowUpAZ, Filter, Search, X } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { RequestStatus } from "../types/admin.types";
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
  const { requests, isLoading, error } = useManageRequestsViewModel();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      filtered = filtered.filter((request) => request.status === activeTab);
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
          searchInText(request.date, query) ||
          searchInText(request.advertiserName, query) ||
          searchInText(request.affiliateId, query) ||
          searchInText(request.priority, query) ||
          searchInText(request.offerId, query) ||
          searchInText(request.offerName, query) ||
          searchInText(request.clientId, query) ||
          searchInText(request.clientName, query) ||
          searchInText(request.creativeType, query) ||
          searchInText(request.status, query)
        );
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc": {
          const aDate = parseDate(a.date);
          const bDate = parseDate(b.date);
          return bDate.getTime() - aDate.getTime();
        }
        case "date-asc": {
          const aDate = parseDate(a.date);
          const bDate = parseDate(b.date);
          return aDate.getTime() - bDate.getTime();
        }
        case "priority-high": {
          const aPriority = getPriorityValue(a.priority);
          const bPriority = getPriorityValue(b.priority);
          if (bPriority !== aPriority) {
            return bPriority - aPriority;
          }
          return parseDate(b.date).getTime() - parseDate(a.date).getTime();
        }
        case "priority-low": {
          const aPriority = getPriorityValue(a.priority);
          const bPriority = getPriorityValue(b.priority);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          return parseDate(b.date).getTime() - parseDate(a.date).getTime();
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

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("date-desc");
    setPriorityFilter("all");
    setActiveTab("all");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (sortBy !== "date-desc") count++;
    if (priorityFilter !== "all") count++;
    if (activeTab !== "all") count++;
    return count;
  }, [searchQuery, sortBy, priorityFilter, activeTab]);

  const hasActiveFilters = activeFiltersCount > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading requests...</div>
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

  if (!requests || requests.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No requests available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <TabsList
              className="flex-1 grid grid-cols-6 h-auto p-1 gap-1"
              style={{ backgroundColor: variables.colors.inputBackgroundColor }}
            >
              <TabsTrigger
                value="all"
                className="h-10 px-4 rounded-md font-medium transition-all"
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
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="h-10 px-4 rounded-md font-medium transition-all"
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
              >
                New
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="h-10 px-4 rounded-md font-medium transition-all"
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
              >
                Pending Approvals
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="h-10 px-4 rounded-md font-medium transition-all"
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
              >
                Approved
              </TabsTrigger>
              <TabsTrigger
                value="rejected"
                className="h-10 px-4 rounded-md font-medium transition-all"
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
              >
                Rejected
              </TabsTrigger>
              <TabsTrigger
                value="sent-back"
                className="h-10 px-4 rounded-md font-medium transition-all"
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
              >
                Sent Back
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

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter
                className="h-4 w-4"
                style={{ color: variables.colors.inputTextColor }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: variables.colors.inputTextColor }}
              >
                Filters:
              </span>
              {activeFiltersCount > 0 && (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full"
                  style={{
                    backgroundColor:
                      variables.colors.buttonDefaultBackgroundColor,
                    color: variables.colors.buttonDefaultTextColor,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </div>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger
                className="w-[200px] h-9 font-inter text-sm"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: variables.colors.inputBorderColor,
                  color: variables.colors.inputTextColor,
                }}
              >
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">
                  <div className="flex items-center gap-2">
                    <ArrowDownAZ className="h-4 w-4" />
                    <span>Newest First</span>
                  </div>
                </SelectItem>
                <SelectItem value="date-asc">
                  <div className="flex items-center gap-2">
                    <ArrowUpAZ className="h-4 w-4" />
                    <span>Oldest First</span>
                  </div>
                </SelectItem>
                <SelectItem value="priority-high">
                  <div className="flex items-center gap-2">
                    <ArrowDownAZ className="h-4 w-4" />
                    <span>Priority: High to Medium</span>
                  </div>
                </SelectItem>
                <SelectItem value="priority-low">
                  <div className="flex items-center gap-2">
                    <ArrowUpAZ className="h-4 w-4" />
                    <span>Priority: Medium to High</span>
                  </div>
                </SelectItem>
                <SelectItem value="advertiser-asc">
                  <div className="flex items-center gap-2">
                    <ArrowDownAZ className="h-4 w-4" />
                    <span>Advertiser: A-Z</span>
                  </div>
                </SelectItem>
                <SelectItem value="advertiser-desc">
                  <div className="flex items-center gap-2">
                    <ArrowUpAZ className="h-4 w-4" />
                    <span>Advertiser: Z-A</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                setPriorityFilter(value as PriorityFilter)
              }
            >
              <SelectTrigger
                className="w-[180px] h-9 font-inter text-sm"
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: variables.colors.inputBorderColor,
                  color: variables.colors.inputTextColor,
                }}
              >
                <SelectValue placeholder="Priority filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-9 gap-2 font-inter text-sm"
                style={{
                  borderColor: variables.colors.inputBorderColor,
                  color: variables.colors.inputTextColor,
                }}
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </Button>
            )}

            <div
              className="ml-auto text-sm"
              style={{ color: variables.colors.inputPlaceholderColor }}
            >
              {filteredAndSortedRequests.length}{" "}
              {filteredAndSortedRequests.length === 1 ? "request" : "requests"}
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredAndSortedRequests.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">
                No {activeTab === "all" ? "" : activeTab} requests available
              </div>
            </div>
          ) : (
            <RequestSection
              requests={filteredAndSortedRequests}
              startIndex={0}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
