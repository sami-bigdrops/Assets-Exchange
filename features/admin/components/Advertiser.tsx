"use client";

import { ChevronRight, ListFilter, Plus, Search } from "lucide-react";
import { useState } from "react";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { manageAdvertisers } from "../models/advertiser.model";
import type { Advertiser as AdvertiserType } from "../types/admin.types";
import { useAdvertiserViewModel } from "../view-models/useAdvertiserViewModel";

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

export function Advertiser() {
  const variables = getVariables();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(null);
  const [creationMethodFilter, setCreationMethodFilter] =
    useState<CreationMethodFilter>(null);
  const [sortByFilter, setSortByFilter] = useState<SortByFilter>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>(null);

  const { advertisers, isLoading, error } = useAdvertiserViewModel();

  const columns = [
    { header: "ID", width: "100px" },
    { header: "Advertiser Name", width: "1.2fr" },
    { header: "Adv Platform", width: "1.2fr" },
    { header: "Created Manually / via API", width: "1.2fr" },
    { header: "Status", width: "140px" },
    { header: "Actions", width: "200px" },
  ];

  const filteredAdvertisers = manageAdvertisers
    .filter((advertiser) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        advertiser.id.toLowerCase().includes(query) ||
        advertiser.advertiserName.toLowerCase().includes(query) ||
        advertiser.advPlatform.toLowerCase().includes(query);

      const matchesStatus = !statusFilter || advertiser.status === statusFilter;
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
    });

  const handleEditDetails = (_id: string) => {};

  const handleBrandGuidelines = (_id: string) => {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading advertisers...</div>
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

  if (!advertisers || advertisers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No advertisers available</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
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

          <Button
            variant="outline"
            className="h-10 font-inter font-medium rounded-md border shadow-[0_2px_4px_0_rgba(0,0,0,0.1)]"
            style={{
              color: variables.colors.buttonOutlineTextColor,
              borderColor: variables.colors.buttonOutlineBorderColor,
              backgroundColor: variables.colors.cardBackground,
            }}
          >
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

      <EntityDataTable
        data={filteredAdvertisers}
        columns={columns}
        renderRow={(advertiser: AdvertiserType, index: number) => (
          <EntityDataCard
            id={advertiser.id}
            name={advertiser.advertiserName}
            platform={advertiser.advPlatform}
            createdMethod={advertiser.createdMethod}
            status={advertiser.status}
            variant={index % 2 === 0 ? "purple" : "blue"}
            onEditDetails={() => handleEditDetails(advertiser.id)}
            onBrandGuidelines={() => handleBrandGuidelines(advertiser.id)}
          />
        )}
      />
    </div>
  );
}
