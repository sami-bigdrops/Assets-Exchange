"use client";

import { format } from "date-fns";
import { CalendarIcon, Download, Loader2, Search } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  timestamp: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AuditLogsTable() {
  const [adminID, setAdminID] = useState<string>("");
  const [actionType, setActionType] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<AuditLogsResponse["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(
    async (currentPage: number = page) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        // Ignore empty or "All" filters
        if (adminID.trim()) {
          params.append("adminId", adminID.trim());
        }

        if (actionType && actionType.trim() !== "") {
          params.append("action", actionType);
        }

        if (dateFrom) {
          params.append("from", format(dateFrom, "yyyy-MM-dd"));
        }

        if (dateTo) {
          params.append("to", format(dateTo, "yyyy-MM-dd"));
        }

        params.append("page", String(currentPage));
        params.append("limit", String(limit));

        const response = await fetch(
          `/api/ops/audit-logs?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data: AuditLogsResponse = await response.json();

        if (data.success) {
          setLogs(data.data);
          setMeta(data.meta);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch audit logs";
        setError(message);
        toast.error("Error loading audit logs", {
          description: message,
        });
        setLogs([]);
        setMeta(null);
      } finally {
        setIsLoading(false);
      }
    },
    [adminID, actionType, dateFrom, dateTo, limit, page]
  );

  const handleSearch = () => {
    // Validate dates
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error("Invalid date range", {
        description: "dateFrom must be less than or equal to dateTo",
      });
      return;
    }

    // Admin ID validation removed - accepts any string (UUID, CUID, or other formats)
    // Backend will validate the format

    setPage(1);
    fetchAuditLogs(1);
  };

  const handleClearFilters = () => {
    setAdminID("");
    setActionType("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
    fetchAuditLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && meta && newPage <= meta.totalPages) {
      setPage(newPage);
      fetchAuditLogs(newPage);
    }
  };

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();

      if (adminID.trim()) {
        params.append("adminId", adminID.trim());
      }

      if (actionType && actionType.trim() !== "") {
        params.append("action", actionType);
      }

      if (dateFrom) {
        params.append("from", format(dateFrom, "yyyy-MM-dd"));
      }

      if (dateTo) {
        params.append("to", format(dateTo, "yyyy-MM-dd"));
      }

      const response = await fetch(
        `/api/ops/audit-logs/export?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Audit logs exported successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to export audit logs";
      toast.error("Error exporting audit logs", {
        description: message,
      });
    } finally {
      setIsExporting(false);
    }
  }, [adminID, actionType, dateFrom, dateTo]);

  // Load initial data on mount (with no filters)
  useEffect(() => {
    fetchAuditLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {/* Filters Section */}
      <div className="border rounded-lg p-3 bg-card">
        <h3 className="text-sm font-semibold mb-2">Filter Audit Logs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Admin ID Input */}
          <div className="space-y-1.5">
            <Label htmlFor="adminID" className="text-sm">
              Admin ID
            </Label>
            <Input
              id="adminID"
              type="text"
              placeholder="Enter admin ID"
              value={adminID}
              onChange={(e) => setAdminID(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>

          {/* Action Type Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="actionType" className="text-sm">
              Action Type
            </Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger id="actionType">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date From Picker */}
          <div className="space-y-1.5">
            <Label className="text-sm">Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "yyyy-MM-dd") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To Picker */}
          <div className="space-y-1.5">
            <Label className="text-sm">Date To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "yyyy-MM-dd") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Search and Clear Buttons */}
          <div className="space-y-1.5">
            <Label className="text-sm opacity-0 pointer-events-none">
              &nbsp;
            </Label>
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
              <Button
                onClick={handleClearFilters}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="border rounded-lg">
        {error && (
          <div className="p-4 text-destructive border-b">Error: {error}</div>
        )}

        {isLoading && logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No audit logs found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Admin ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {log.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{log.admin_id}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            log.action === "APPROVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : log.action === "REJECT"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          )}
                        >
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                      </TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell>{log.entityId || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details
                          ? JSON.stringify(log.details).slice(0, 50) + "..."
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination and Export */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                {meta && meta.total > 0 ? (
                  <>
                    Showing page {meta.page} of {meta.totalPages} ({meta.total}{" "}
                    total results)
                  </>
                ) : (
                  "No results"
                )}
              </div>
              <div className="flex gap-2">
                {meta && meta.totalPages > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= meta.totalPages || isLoading}
                    >
                      Next
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={
                    isExporting || isLoading || (meta?.total ?? 0) === 0
                  }
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
