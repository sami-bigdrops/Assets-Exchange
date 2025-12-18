"use client";

import { Filter, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { useManageResponsesViewModel } from "../view-models/useManageResponsesViewModel";

import { RequestSection } from "./RequestSection";

type TabValue = "all" | Exclude<RequestStatus, "pending">;
type SortOption =
  | "date-desc"
  | "date-asc"
  | "priority-high"
  | "priority-low"
  | "advertiser-asc"
  | "advertiser-desc";
type PriorityFilter = "all" | "high" | "medium";

export function ManageResponsesPage() {
  const variables = getVariables();
  const { responses, isLoading, error } = useManageResponsesViewModel();

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
    const lowerPriority = priority.toLowerCase();
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
    return text.toLowerCase().includes(query.toLowerCase());
  }, []);

  const filteredAndSortedResponses = useMemo(() => {
    let filtered = [...responses];

    if (activeTab !== "all") {
      filtered = filtered.filter(
        (response) => response.status.toLowerCase() === activeTab
      );
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((response) =>
        response.priority.toLowerCase().includes(priorityFilter.toLowerCase())
      );
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.trim();
      filtered = filtered.filter((response) => {
        return (
          searchInText(response.date, query) ||
          searchInText(response.advertiserName, query) ||
          searchInText(response.affiliateId, query) ||
          searchInText(response.priority, query) ||
          searchInText(response.offerId, query) ||
          searchInText(response.offerName, query) ||
          searchInText(response.clientId, query) ||
          searchInText(response.clientName, query) ||
          searchInText(response.creativeType, query) ||
          searchInText(response.status, query)
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
    responses,
    activeTab,
    debouncedSearchQuery,
    sortBy,
    priorityFilter,
    getPriorityValue,
    parseDate,
    searchInText,
  ]);

  const clearFilters = () => {
    setSortBy("date-desc");
    setPriorityFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = useMemo(() => {
    return sortBy !== "date-desc" || priorityFilter !== "all" || searchQuery;
  }, [sortBy, priorityFilter, searchQuery]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (sortBy !== "date-desc") count++;
    if (priorityFilter !== "all") count++;
    if (searchQuery) count++;
    return count;
  }, [sortBy, priorityFilter, searchQuery]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
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
              className="flex-1 grid grid-cols-5 h-auto p-1 gap-1"
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
                placeholder="Search responses..."
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
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date: Newest First</SelectItem>
                <SelectItem value="date-asc">Date: Oldest First</SelectItem>
                <SelectItem value="priority-high">
                  Priority: High to Low
                </SelectItem>
                <SelectItem value="priority-low">
                  Priority: Low to High
                </SelectItem>
                <SelectItem value="advertiser-asc">
                  Advertiser: A to Z
                </SelectItem>
                <SelectItem value="advertiser-desc">
                  Advertiser: Z to A
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
                <SelectValue placeholder="Filter by priority" />
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
                onClick={clearFilters}
                className="h-9 font-inter text-sm"
                style={{
                  borderColor: variables.colors.inputBorderColor,
                  color: variables.colors.inputTextColor,
                }}
              >
                Clear All Filters
              </Button>
            )}

            <div
              className="ml-auto text-sm"
              style={{ color: variables.colors.inputPlaceholderColor }}
            >
              {filteredAndSortedResponses.length}{" "}
              {filteredAndSortedResponses.length === 1
                ? "response"
                : "responses"}
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredAndSortedResponses.length === 0 ? (
            <div className="flex items-center justify-center p-12 border border-dashed rounded-lg">
              <div className="text-muted-foreground">
                No responses found matching your criteria.
              </div>
            </div>
          ) : (
            <RequestSection
              requests={filteredAndSortedResponses}
              startIndex={0}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
