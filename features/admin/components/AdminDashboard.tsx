"use client";

import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPerformanceChart } from "@/features/admin";
import { Request } from "@/features/admin";
import { Response } from "@/features/admin";
import { StatsCard } from "@/features/dashboard";
import { cn } from "@/lib/utils";

import { useAdminDashboardViewModel } from "../view-models/useAdminDashboardViewModel";

export function AdminDashboard() {
  const { data, isLoading, error } = useAdminDashboardViewModel();

  // Date Range Picker state (All Time = undefined)
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);

  const rangeLabel = React.useMemo(() => {
    if (!range?.from && !range?.to) return "All Time";
    if (range?.from && !range?.to) return format(range.from, "MMM dd, yyyy");
    if (range?.from && range?.to) {
      return `${format(range.from, "MMM dd, yyyy")} - ${format(range.to, "MMM dd, yyyy")}`;
    }
    return "All Time";
  }, [range]);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <div className="text-destructive">Error: {error}</div>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <div className="text-muted-foreground">
            No data available for Admin Dashboard
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {data.stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
      )}

      {/* Date Range Picker (above chart) */}
      {!isLoading && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 justify-start text-left font-normal",
                    !range && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {rangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={range}
                  onSelect={setRange}
                />
              </PopoverContent>
            </Popover>

            {!!range && (
              <Button
                type="button"
                variant="ghost"
                className="h-10"
                onClick={() => setRange(undefined)}
                title="Clear date range"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Chart should refetch when range changes */}
      {!isLoading && <AdminPerformanceChart dateRange={range} />}

      {!isLoading && <Request />}
      {!isLoading && <Response />}
    </div>
  );
}
