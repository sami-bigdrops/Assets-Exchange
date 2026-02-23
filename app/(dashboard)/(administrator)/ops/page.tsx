"use client";

/**
 * Ops Dashboard - Operations Monitoring
 *
 * ACCEPTANCE CRITERIA:
 *
 * Ops Dashboard:
 * ✓ Shows stat cards for Active Jobs, Failed Jobs, Dead Letter Queue, Error Rate, and Latency
 * ✓ Clicking stat cards opens the corresponding detail view
 * ✓ Switching between all views (Summary/Active/Failed/DLQ/Latency) works without errors
 * ✓ Auto-refresh (10s) continues for Ops metrics
 * ✓ Charts, JobTable, and Replay functionality remain unchanged
 */

import { format } from "date-fns";
import {
  AlertCircle,
  Activity,
  Database,
  Loader2,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Archive,
  ChevronDown,
  ChevronRight,
  FileText,
  CalendarIcon,
  Clock,
  Download,
  BarChart3,
  GitBranch,
  Trash2,
  MoveRight,
} from "lucide-react";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { confirmDialog } from "@/components/ui/confirm-dialog";
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
import type { backgroundJobs } from "@/lib/schema";
import { cn } from "@/lib/utils";

type BackgroundJob = typeof backgroundJobs.$inferSelect;

interface OpsMetrics {
  stats: {
    activeJobs: number;
    failedJobs24h: number;
    deadJobs: number;
    stuckJobs: number;
    errorRate: string;
    avgLatency: number | null;
  };
  trends: Array<{
    hour: string;
    success: number;
    failed: number;
    avg_duration: number;
  }>;
  activeJobs: BackgroundJob[];
  failedJobs: BackgroundJob[];
  stuckJobs?: BackgroundJob[];
  recentJobs: BackgroundJob[];
}

interface AuditLog {
  id: string;
  admin_id: string;
  action: "APPROVE" | "REJECT";
  timestamp: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuditLogsResponse {
  success: true;
  data: AuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Ops Dashboard View Types
 *
 * Each view type corresponds to a stat card and detail view.
 */
type ViewType =
  | "summary"
  | "active"
  | "failed"
  | "dead"
  | "stuck"
  | "error-rate"
  | "latency"
  | "audit"
  | "daily-stats"
  | "batch-ab-testing";

export default function OpsPage() {
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedView, setSelectedView] = useState<ViewType>("summary");
  const [isMounted, setIsMounted] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditLogsMeta, setAuditLogsMeta] = useState<
    AuditLogsResponse["meta"] | null
  >(null);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);

  // Audit Logs filter state
  const [filterAdminId, setFilterAdminId] = useState("");
  const [filterActionType, setFilterActionType] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(
    undefined
  );
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);

  // Stuck Jobs state
  const [stuckJobs, setStuckJobs] = useState<BackgroundJob[]>([]);
  const [stuckJobsLoading, setStuckJobsLoading] = useState(false);
  const [stuckJobsError, setStuckJobsError] = useState<string | null>(null);

  // Daily Stats state
  const [dailyStats, setDailyStats] = useState<{
    totalSubmitted: number;
    totalApproved: number;
    avgApprovalTime: number | null;
    topPublishers: Array<{
      publisherId: string;
      publisherName: string;
      requestCount: number;
    }> | null;
    date: string;
    lastUpdated: string;
  } | null>(null);
  const [dailyStatsLoading, setDailyStatsLoading] = useState(false);
  const [dailyStatsError, setDailyStatsError] = useState<string | null>(null);

  // Batch A/B Testing state
  const [batchAnalytics, setBatchAnalytics] = useState<{
    batches: Array<{
      batchId: string;
      batchLabel: string;
      totalImpressions: number;
      totalClicks: number;
      ctr: number;
    }>;
    summary: {
      totalBatches: number;
      totalImpressions: number;
      totalClicks: number;
      averageCtr: number;
    };
  } | null>(null);
  const [batchAnalyticsLoading, setBatchAnalyticsLoading] = useState(false);
  const [batchAnalyticsError, setBatchAnalyticsError] = useState<string | null>(
    null
  );

  // Batch creation form state
  const [batchLabel, setBatchLabel] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [assetsList, setAssetsList] = useState<
    Array<{
      id: string;
      publisherId: string;
      status: string;
      createdAt: string;
      approvedAt: string | null;
    }>
  >([]);
  const [assetsListLoading, setAssetsListLoading] = useState(false);
  const [assetsListError, setAssetsListError] = useState<string | null>(null);
  const [batchCreateLoading, setBatchCreateLoading] = useState(false);
  const [batchCreateError, setBatchCreateError] = useState<string | null>(null);
  const [batchCreateSuccess, setBatchCreateSuccess] = useState(false);

  // Batches list state
  const [batchesList, setBatchesList] = useState<
    Array<{
      id: string;
      batchLabel: string;
      description: string | null;
      status: "active" | "inactive" | "archived";
      createdBy: string;
      createdAt: string;
      updatedAt: string;
      assetCount: number;
      assets?: Array<{
        id: string;
        publisherId: string;
        status: string;
        createdAt: string;
        approvedAt: string | null;
      }>;
    }>
  >([]);
  const [batchesListLoading, setBatchesListLoading] = useState(false);
  const [batchesListError, setBatchesListError] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(
    new Set()
  );
  const [assetActionLoading, setAssetActionLoading] = useState<Set<string>>(
    new Set()
  );

  // Batch comparison state
  const [batchA, setBatchA] = useState<string>("");
  const [batchB, setBatchB] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<{
    batchA: {
      batchId: string;
      batchLabel: string;
      totalImpressions: number;
      totalClicks: number;
      ctr: number;
    } | null;
    batchB: {
      batchId: string;
      batchLabel: string;
      totalImpressions: number;
      totalClicks: number;
      ctr: number;
    } | null;
  } | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchMetrics = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/ops/metrics");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (_error) {
      toast.error("Failed to update operations data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchDailyStats = useCallback(async () => {
    setDailyStatsLoading(true);
    setDailyStatsError(null);
    try {
      const res = await fetch("/api/admin/daily-stats");
      const json = await res.json().catch(() => ({
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
      }));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      if (json.success) {
        if (json.data) {
          setDailyStats(json.data);
        } else {
          setDailyStats(null);
        }
      } else {
        throw new Error(json.error || "Failed to fetch daily stats");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch daily stats";
      setDailyStatsError(errorMessage);
      setDailyStats(null);
      console.error("Daily stats fetch error:", error);
    } finally {
      setDailyStatsLoading(false);
    }
  }, []);

  const fetchBatchAnalytics = useCallback(async () => {
    setBatchAnalyticsLoading(true);
    setBatchAnalyticsError(null);

    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    timeoutId = setTimeout(() => {
      controller.abort();
      setBatchAnalyticsLoading(false);
      setBatchAnalyticsError("Request timed out. Please try again.");
    }, 30000); // 30 second timeout

    try {
      const res = await fetch("/api/admin/batches/analytics", {
        signal: controller.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
      }));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      if (json.success) {
        if (json.data) {
          setBatchAnalytics(json.data);
        } else {
          setBatchAnalytics(null);
        }
      } else {
        throw new Error(json.error || "Failed to fetch batch analytics");
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return; // Timeout already handled
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch batch analytics";
      setBatchAnalyticsError(errorMessage);
      setBatchAnalytics(null);
      console.error("Batch analytics fetch error:", error);
    } finally {
      setBatchAnalyticsLoading(false);
    }
  }, []);

  // Auto-refresh Ops metrics every 10 seconds (Daily Stats excluded - only updates once per day via cron)
  useEffect(() => {
    fetchMetrics(true);
    // Fetch Daily Stats only on initial page load (not on interval)
    // Daily Stats are calculated once per day at 12:01 AM via scheduled cron job
    fetchDailyStats();
    const interval = setInterval(() => {
      fetchMetrics();
      // Daily Stats NOT included in interval - they only change once per day
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics, fetchDailyStats]);

  // Fetch batch analytics when batch-ab-testing view is selected
  useEffect(() => {
    if (
      selectedView === "batch-ab-testing" &&
      !batchAnalyticsLoading &&
      !batchAnalytics
    ) {
      fetchBatchAnalytics();
    }
  }, [
    selectedView,
    batchAnalyticsLoading,
    batchAnalytics,
    fetchBatchAnalytics,
  ]);

  const fetchAssetsList = useCallback(async () => {
    setAssetsListLoading(true);
    setAssetsListError(null);

    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    timeoutId = setTimeout(() => {
      controller.abort();
      setAssetsListLoading(false);
      setAssetsListError("Request timed out. Please try again.");
    }, 30000); // 30 second timeout

    try {
      const res = await fetch("/api/admin/assets?limit=500", {
        signal: controller.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
      }));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      if (json.success && json.data) {
        setAssetsList(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch assets");
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return; // Timeout already handled
      }
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch assets";
      setAssetsListError(errorMessage);
      setAssetsList([]);
      console.error("Assets fetch error:", error);
    } finally {
      setAssetsListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      selectedView === "batch-ab-testing" &&
      assetsList.length === 0 &&
      !assetsListLoading
    ) {
      fetchAssetsList();
    }
  }, [selectedView, assetsList.length, assetsListLoading, fetchAssetsList]);

  const handleAssetToggle = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const fetchBatchesList = useCallback(async () => {
    setBatchesListLoading(true);
    setBatchesListError(null);

    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    timeoutId = setTimeout(() => {
      controller.abort();
      setBatchesListLoading(false);
      setBatchesListError("Request timed out. Please try again.");
    }, 30000);

    try {
      const res = await fetch("/api/admin/batches?status=active", {
        signal: controller.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({
        data: [],
        error: `HTTP ${res.status}: ${res.statusText}`,
      }));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const batches = json.data || [];

      const batchesWithAssets = await Promise.all(
        batches.map(async (batch: { id: string }) => {
          try {
            const assetRes = await fetch(
              `/api/admin/batches/${batch.id}?includeAssets=true`
            );
            if (assetRes.ok) {
              const assetJson = await assetRes.json();
              return { ...batch, assets: assetJson.assets || [] };
            }
            return { ...batch, assets: [] };
          } catch {
            return { ...batch, assets: [] };
          }
        })
      );

      setBatchesList(batchesWithAssets);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch batches";
      setBatchesListError(errorMessage);
      setBatchesList([]);
      console.error("Batches fetch error:", error);
    } finally {
      setBatchesListLoading(false);
    }
  }, []);

  const handleCreateBatch = useCallback(async () => {
    if (!batchLabel.trim()) {
      setBatchCreateError("Batch label is required");
      return;
    }

    if (selectedAssets.size === 0) {
      setBatchCreateError("Please select at least one asset");
      return;
    }

    setBatchCreateLoading(true);
    setBatchCreateError(null);
    setBatchCreateSuccess(false);

    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchLabel: batchLabel.trim(),
          description: "",
          status: "active",
        }),
      });

      const json = await res.json().catch(() => ({
        error: `HTTP ${res.status}: ${res.statusText}`,
      }));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const batchId = json.id;

      const assetAssignments = Array.from(selectedAssets);
      const successfulAssignments: string[] = [];
      const failedAssignments: Array<{ assetId: string; error: string }> = [];

      for (const assetId of assetAssignments) {
        try {
          const assignRes = await fetch(
            `/api/admin/batches/${batchId}/assets/${assetId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!assignRes.ok) {
            const assignJson = await assignRes.json().catch(() => ({
              error: `HTTP ${assignRes.status}: ${assignRes.statusText}`,
            }));
            failedAssignments.push({
              assetId,
              error:
                assignJson.error ||
                `HTTP ${assignRes.status}: ${assignRes.statusText}`,
            });
          } else {
            successfulAssignments.push(assetId);
          }
        } catch (error) {
          failedAssignments.push({
            assetId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      if (failedAssignments.length > 0) {
        const errorMessage =
          failedAssignments.length === assetAssignments.length
            ? `Failed to assign all assets. Batch created but no assets assigned.`
            : `Batch created but ${failedAssignments.length} of ${assetAssignments.length} assets failed to assign.`;

        setBatchCreateError(errorMessage);
        toast.error(errorMessage);

        // Still refresh to show the batch that was created
        fetchBatchAnalytics();
        fetchBatchesList();
      } else {
        setBatchCreateSuccess(true);
        setBatchLabel("");
        setSelectedAssets(new Set());
        toast.success("Batch created and assets assigned successfully");

        setTimeout(() => {
          setBatchCreateSuccess(false);
          fetchBatchAnalytics();
          fetchBatchesList();
        }, 2000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create batch";
      setBatchCreateError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setBatchCreateLoading(false);
    }
  }, [batchLabel, selectedAssets, fetchBatchAnalytics, fetchBatchesList]);

  useEffect(() => {
    if (
      selectedView === "batch-ab-testing" &&
      batchesList.length === 0 &&
      !batchesListLoading
    ) {
      fetchBatchesList();
    }
  }, [selectedView, batchesList.length, batchesListLoading, fetchBatchesList]);

  const toggleBatchExpand = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  const handleRemoveAsset = useCallback(
    async (batchId: string, assetId: string) => {
      await confirmDialog({
        title: "Remove Asset from Batch",
        description:
          "Are you sure you want to remove this asset from the batch? This action cannot be undone.",
        variant: "destructive",
        onConfirm: async () => {
          const actionKey = `${batchId}-${assetId}-remove`;
          setAssetActionLoading((prev) => new Set(prev).add(actionKey));

          try {
            const res = await fetch(
              `/api/admin/batches/${batchId}/assets/${assetId}`,
              {
                method: "DELETE",
              }
            );

            const json = await res.json().catch(() => ({
              error: `HTTP ${res.status}: ${res.statusText}`,
            }));

            if (!res.ok) {
              throw new Error(
                json.error || `HTTP ${res.status}: ${res.statusText}`
              );
            }

            toast.success("Asset removed from batch");
            fetchBatchesList();
            fetchBatchAnalytics();
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to remove asset";
            toast.error(errorMessage);
          } finally {
            setAssetActionLoading((prev) => {
              const newSet = new Set(prev);
              newSet.delete(actionKey);
              return newSet;
            });
          }
        },
      });
    },
    [fetchBatchesList, fetchBatchAnalytics]
  );

  const handleMoveAsset = useCallback(
    async (fromBatchId: string, assetId: string, toBatchId: string) => {
      if (!toBatchId || toBatchId === fromBatchId) return;

      await confirmDialog({
        title: "Move Asset to Another Batch",
        description: `Are you sure you want to move this asset to the selected batch?`,
        variant: "default",
        onConfirm: async () => {
          const actionKey = `${fromBatchId}-${assetId}-move`;
          setAssetActionLoading((prev) => new Set(prev).add(actionKey));

          try {
            const res = await fetch(
              `/api/admin/batches/${fromBatchId}/assets/${assetId}/move`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ toBatchId }),
              }
            );

            const json = await res.json().catch(() => ({
              error: `HTTP ${res.status}: ${res.statusText}`,
            }));

            if (!res.ok) {
              throw new Error(
                json.error || `HTTP ${res.status}: ${res.statusText}`
              );
            }

            toast.success("Asset moved to batch");
            fetchBatchesList();
            fetchBatchAnalytics();
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to move asset";
            toast.error(errorMessage);
          } finally {
            setAssetActionLoading((prev) => {
              const newSet = new Set(prev);
              newSet.delete(actionKey);
              return newSet;
            });
          }
        },
      });
    },
    [fetchBatchesList, fetchBatchAnalytics]
  );

  const fetchComparison = useCallback(async () => {
    if (!batchA || !batchB || batchA === batchB) {
      setComparisonData(null);
      setComparisonError(null);
      setComparisonLoading(false);
      return;
    }

    setComparisonLoading(true);
    setComparisonError(null);

    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    timeoutId = setTimeout(() => {
      controller.abort();
      setComparisonLoading(false);
      setComparisonError("Request timed out. Please try again.");
    }, 30000); // 30 second timeout

    try {
      const res = await fetch(
        `/api/admin/batches/analytics?batchIds=${batchA},${batchB}`,
        {
          signal: controller.signal,
        }
      );
      if (timeoutId) clearTimeout(timeoutId);

      const json = await res.json().catch(() => ({
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
      }));

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      if (json.success && json.data && json.data.batches) {
        const batches = json.data.batches;
        const batchAData = batches.find(
          (b: { batchId: string }) => b.batchId === batchA
        );
        const batchBData = batches.find(
          (b: { batchId: string }) => b.batchId === batchB
        );

        setComparisonData({
          batchA: batchAData || null,
          batchB: batchBData || null,
        });
      } else {
        setComparisonData(null);
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return; // Timeout already handled
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch comparison data";
      setComparisonError(errorMessage);
      setComparisonData(null);
      console.error("Comparison fetch error:", error);
    } finally {
      setComparisonLoading(false);
    }
  }, [batchA, batchB]);

  useEffect(() => {
    if (batchA && batchB && batchA !== batchB) {
      fetchComparison();
    } else {
      setComparisonData(null);
      setComparisonError(null);
    }
  }, [batchA, batchB, fetchComparison]);

  const fetchAuditLogs = useCallback(
    async (
      page: number = 1,
      filters?: {
        adminId?: string;
        actionType?: string;
        dateFrom?: Date;
        dateTo?: Date;
      }
    ) => {
      setAuditLogsLoading(true);
      setAuditLogsError(null);
      try {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("limit", "20");

        const effectiveAdminId = filters?.adminId ?? filterAdminId;
        const effectiveActionType = filters?.actionType ?? filterActionType;
        const effectiveDateFrom = filters?.dateFrom ?? filterDateFrom;
        const effectiveDateTo = filters?.dateTo ?? filterDateTo;

        if (effectiveAdminId && effectiveAdminId.trim()) {
          params.append("adminId", effectiveAdminId.trim());
        }

        if (effectiveActionType && effectiveActionType !== "All") {
          params.append("actionType", effectiveActionType);
        }

        if (effectiveDateFrom) {
          params.append("startDate", effectiveDateFrom.toISOString());
        }

        if (effectiveDateTo) {
          params.append("endDate", effectiveDateTo.toISOString());
        }

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);

        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(
              () =>
                ({ error: "Failed to fetch audit logs" }) as { error: string }
            );
          const errorMessage = errorData.error || `HTTP ${res.status}`;
          throw new Error(errorMessage);
        }

        const data: AuditLogsResponse = await res.json();

        if (data.success && Array.isArray(data.data) && data.meta) {
          setAuditLogs(data.data);
          setAuditLogsMeta(data.meta);
          setAuditLogsPage(page);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (_err) {
        const errorMessage =
          _err instanceof Error ? _err.message : "Failed to fetch audit logs";
        setAuditLogsError(errorMessage);
        setAuditLogs([]);
        setAuditLogsMeta(null);
        toast.error("Failed to fetch audit logs");
      } finally {
        setAuditLogsLoading(false);
      }
    },
    [filterAdminId, filterActionType, filterDateFrom, filterDateTo]
  );

  const handleExportCSV = useCallback(async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();

      if (filterAdminId && filterAdminId.trim()) {
        params.append("adminId", filterAdminId.trim());
      }

      if (filterActionType && filterActionType.trim() !== "") {
        params.append("actionType", filterActionType);
      }

      if (filterDateFrom) {
        params.append("startDate", filterDateFrom.toISOString());
      }

      if (filterDateTo) {
        params.append("endDate", filterDateTo.toISOString());
      }

      const url = `/api/admin/audit-logs/export?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to export audit logs" }));
        const errorMessage = errorData.error || `HTTP ${res.status}`;
        throw new Error(errorMessage);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Audit logs exported successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to export audit logs";
      toast.error(errorMessage);
    } finally {
      setExportLoading(false);
    }
  }, [filterAdminId, filterActionType, filterDateFrom, filterDateTo]);

  const fetchStuckJobs = useCallback(async () => {
    setStuckJobsLoading(true);
    setStuckJobsError(null);
    try {
      const res = await fetch("/api/admin/ops/stuck-jobs");
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Failed to fetch stuck jobs" }));
        const errorMessage = errorData.error || `HTTP ${res.status}`;
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (data.stuckJobs && Array.isArray(data.stuckJobs)) {
        const transformedJobs: BackgroundJob[] = data.stuckJobs.map(
          (creative: {
            id: string;
            status: string;
            statusUpdatedAt: Date | string | null;
            scanAttempts: number | null;
            createdAt: Date | string;
            updatedAt: Date | string | null;
            lastScanError: string | null;
            requestId: string | null;
          }) => ({
            id: creative.id,
            type: "SCAN_CREATIVE",
            status: "running",
            progress: creative.scanAttempts || 0,
            total: 1,
            retryCount: creative.scanAttempts || 0,
            maxRetries: 5,
            createdAt: new Date(creative.createdAt),
            error: creative.lastScanError || null,
            payload: creative.requestId
              ? { requestId: creative.requestId }
              : null,
            result: null,
            nextRunAt: null,
            finishedAt: null,
            durationMs: null,
            deadLetteredAt: null,
          })
        );
        setStuckJobs(transformedJobs);
      } else {
        setStuckJobs([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stuck jobs";
      setStuckJobsError(errorMessage);
      setStuckJobs([]);
      toast.error("Failed to fetch stuck jobs");
    } finally {
      setStuckJobsLoading(false);
    }
  }, []);

  // Fetch audit logs when audit view is selected
  useEffect(() => {
    if (
      selectedView === "audit" &&
      !auditLogsLoading &&
      auditLogs.length === 0 &&
      !auditLogsError
    ) {
      fetchAuditLogs(1);
    }
  }, [
    selectedView,
    auditLogsLoading,
    auditLogs.length,
    auditLogsError,
    fetchAuditLogs,
  ]);

  const handleReplay = async (jobId: string) => {
    const toastId = toast.loading("Initiating replay...");
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/replay`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Replay failed");
      toast.success("Job replay started", { id: toastId });
      fetchMetrics();
    } catch (_error) {
      toast.error("Failed to replay job", { id: toastId });
    }
  };

  const chartData = useMemo(() => {
    if (!data?.trends) return [];
    return data.trends.map((t) => ({
      ...t,
      time: new Date(t.hour).getHours().toString().padStart(2, "0") + ":00",
      total: Number(t.success) + Number(t.failed),
    }));
  }, [data]);

  if (!isMounted) return null;

  if (isLoading && !data) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statsConfig = [
    {
      id: "active" as ViewType,
      title: "Active Jobs",
      value: data?.stats.activeJobs.toString() || "0",
      icon: Activity,
      description: "Currently processing",
      color: "text-blue-500",
    },
    {
      id: "failed" as ViewType,
      title: "Failed Jobs (24h)",
      value: data?.stats.failedJobs24h.toString() || "0",
      icon: AlertCircle,
      description: "Requires attention",
      variant: (data?.stats.failedJobs24h || 0) > 0 ? "destructive" : "default",
      color: "text-red-500",
    },
    {
      id: "dead" as ViewType,
      title: "Dead Letter Queue",
      value: data?.stats.deadJobs.toString() || "0",
      icon: Archive,
      description: "Intervention needed",
      variant: (data?.stats.deadJobs || 0) > 0 ? "destructive" : "default",
      color: "text-gray-500",
    },
    {
      id: "stuck" as ViewType,
      title: "Stuck Jobs",
      value: data?.stats.stuckJobs?.toString() || "0",
      icon: Clock,
      description: "SCANNING > 15 min",
      variant: (data?.stats.stuckJobs || 0) > 0 ? "destructive" : "default",
      color: "text-yellow-500",
    },
    {
      id: "error-rate" as ViewType,
      title: "Error Rate",
      value: `${data?.stats.errorRate || "0"}%`,
      icon: Database,
      description: "Last 24h",
      color: "text-orange-500",
    },
    {
      id: "audit" as ViewType,
      title: "Audit Logs",
      value: auditLogsMeta?.total.toString() || "-",
      icon: FileText,
      description: "System activity",
      color: "text-purple-500",
    },
    {
      id: "daily-stats" as ViewType,
      title: "Daily Metrics Aggregation",
      value:
        dailyStatsLoading && !dailyStats
          ? "..."
          : dailyStats?.avgApprovalTime != null
            ? `${Math.round(dailyStats.avgApprovalTime / 1000 / 60)}m`
            : "-",
      icon: BarChart3,
      description: dailyStats?.lastUpdated
        ? `Updated ${format(new Date(dailyStats.lastUpdated), "MMM dd, HH:mm")}`
        : "Latest daily stats",
      color: "text-green-500",
    },
    {
      id: "batch-ab-testing" as ViewType,
      title: "Batch A/B Testing",
      value:
        batchAnalyticsLoading && !batchAnalytics
          ? "..."
          : batchAnalytics?.summary.totalBatches != null
            ? batchAnalytics.summary.totalBatches.toString()
            : "-",
      icon: GitBranch,
      description: batchAnalytics?.summary.totalBatches
        ? `${batchAnalytics.summary.totalBatches} active batches`
        : "Performance metrics",
      color: "text-indigo-500",
    },
  ];

  const renderDetailView = () => {
    switch (selectedView) {
      case "active":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Active Jobs Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorSuccess"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.1}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="success"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorSuccess)"
                      name="Completed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active Job List</CardTitle>
              </CardHeader>
              <CardContent>
                <JobTable
                  jobs={data?.activeJobs || []}
                  onReplay={handleReplay}
                />
              </CardContent>
            </Card>
          </div>
        );
      case "failed":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Failure Trend (Last 24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Failures"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Failed Job List (Last 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <JobTable
                  jobs={data?.failedJobs || []}
                  onReplay={handleReplay}
                />
              </CardContent>
            </Card>
          </div>
        );
      case "dead":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-gray-500" />
                  Dead Letter Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <JobTable
                  jobs={
                    data?.failedJobs.filter((j) => j.status === "dead") || []
                  }
                  onReplay={handleReplay}
                />
              </CardContent>
            </Card>
          </div>
        );
      case "stuck":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Stuck Jobs (SCANNING &gt; 15 min)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={fetchStuckJobs}
                  disabled={stuckJobsLoading}
                  className="h-9"
                >
                  {stuckJobsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load Stuck Jobs"
                  )}
                </Button>
                {stuckJobsError ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-destructive">
                        Failed to load stuck jobs
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stuckJobsError}
                      </p>
                    </div>
                  </div>
                ) : stuckJobsLoading && stuckJobs.length === 0 ? (
                  <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <JobTable jobs={stuckJobs} onReplay={handleReplay} />
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "latency":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Latency Performance (ms)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      unit="ms"
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="avg_duration"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.1}
                      name="Avg Latency"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Latest Successful Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <JobTable
                  jobs={
                    data?.recentJobs.filter((j) => j.status === "completed") ||
                    []
                  }
                  onReplay={handleReplay}
                />
              </CardContent>
            </Card>
          </div>
        );
      case "audit":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 pb-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Filters
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[150px]">
                      <Input
                        placeholder="Enter admin ID"
                        value={filterAdminId}
                        onChange={(e) => setFilterAdminId(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="w-[140px]">
                      <Select
                        value={filterActionType}
                        onValueChange={setFilterActionType}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPROVE">APPROVE</SelectItem>
                          <SelectItem value="REJECT">REJECT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-[140px]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-9 w-full justify-start text-left font-normal",
                              !filterDateFrom && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDateFrom ? (
                              format(new Date(filterDateFrom), "MMM dd, yyyy")
                            ) : (
                              <span>Date From</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filterDateFrom}
                            onSelect={setFilterDateFrom}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="w-[140px]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-9 w-full justify-start text-left font-normal",
                              !filterDateTo && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filterDateTo ? (
                              format(new Date(filterDateTo), "MMM dd, yyyy")
                            ) : (
                              <span>Date To</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filterDateTo}
                            onSelect={setFilterDateTo}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      onClick={() => fetchAuditLogs(1)}
                      disabled={auditLogsLoading}
                      className="h-9"
                    >
                      {auditLogsLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        "Search"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterAdminId("");
                        setFilterActionType("All");
                        setFilterDateFrom(undefined);
                        setFilterDateTo(undefined);
                        fetchAuditLogs(1, {
                          adminId: "",
                          actionType: "All",
                          dateFrom: undefined,
                          dateTo: undefined,
                        });
                      }}
                      disabled={auditLogsLoading}
                      className="h-9"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={exportLoading || auditLogsLoading}
                      className="h-9"
                    >
                      {exportLoading ? (
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
                <div className="border-t pt-3">
                  {auditLogsError ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-destructive">
                          Failed to load audit logs
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {auditLogsError}
                        </p>
                      </div>
                    </div>
                  ) : auditLogsLoading && auditLogs.length === 0 ? (
                    <div className="flex h-[400px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                            {auditLogs.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center py-10 text-muted-foreground italic"
                                >
                                  No audit logs found
                                </TableCell>
                              </TableRow>
                            ) : (
                              auditLogs.map((log) => (
                                <TableRow key={log.id}>
                                  <TableCell className="font-mono text-xs">
                                    {log.id.slice(0, 8)}...
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {log.admin_id}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        log.action === "APPROVE"
                                          ? "default"
                                          : "destructive"
                                      }
                                    >
                                      {log.action}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {log.entityType || "-"}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {log.entityId || "-"}
                                  </TableCell>
                                  <TableCell className="text-xs max-w-[200px] truncate">
                                    {log.details
                                      ? JSON.stringify(log.details).slice(0, 50)
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {auditLogsMeta && auditLogsMeta.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Page {auditLogsMeta.page} of{" "}
                            {auditLogsMeta.totalPages} ({auditLogsMeta.total}{" "}
                            total)
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchAuditLogs(auditLogsPage - 1)}
                              disabled={auditLogsPage <= 1 || auditLogsLoading}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchAuditLogs(auditLogsPage + 1)}
                              disabled={
                                auditLogsPage >= auditLogsMeta.totalPages ||
                                auditLogsLoading
                              }
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "daily-stats":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  Daily Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dailyStatsLoading && !dailyStats ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : dailyStatsError ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-destructive">
                        Failed to load daily stats
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dailyStatsError}
                      </p>
                    </div>
                  </div>
                ) : !dailyStats ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">
                      No daily stats available yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Submitted
                        </p>
                        <p className="text-2xl font-bold">
                          {dailyStats.totalSubmitted}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Approved
                        </p>
                        <p className="text-2xl font-bold">
                          {dailyStats.totalApproved}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Avg Approval Time
                        </p>
                        <p className="text-2xl font-bold">
                          {dailyStats.avgApprovalTime != null
                            ? `${Math.round(dailyStats.avgApprovalTime / 1000 / 60)}m`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Approval Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {dailyStats.totalSubmitted > 0
                            ? `${Math.round(
                                (dailyStats.totalApproved /
                                  dailyStats.totalSubmitted) *
                                  100
                              )}%`
                            : "-"}
                        </p>
                      </div>
                    </div>
                    {dailyStats.topPublishers &&
                      dailyStats.topPublishers.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Top Publishers
                          </p>
                          <div className="space-y-2">
                            {dailyStats.topPublishers.map((publisher, idx) => (
                              <div
                                key={`publisher-${publisher.publisherId ?? idx}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {idx + 1}.{" "}
                                  {publisher.publisherName ||
                                    publisher.publisherId}
                                </span>
                                <span className="font-medium">
                                  {publisher.requestCount} requests
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    <div className="text-xs text-muted-foreground pt-4 border-t">
                      Last updated:{" "}
                      {format(
                        new Date(dailyStats.lastUpdated),
                        "MMM dd, yyyy HH:mm:ss"
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "batch-ab-testing":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-indigo-500" />
                  Create Batch & Assign Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 pb-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Batch Label
                  </Label>
                  <Input
                    placeholder="Enter batch label"
                    value={batchLabel}
                    onChange={(e) => {
                      setBatchLabel(e.target.value);
                      setBatchCreateError(null);
                    }}
                    className="h-9"
                    disabled={batchCreateLoading}
                  />
                </div>
                <div className="space-y-1.5 pb-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Select Assets
                  </Label>
                  {assetsListLoading ? (
                    <div className="flex h-[200px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : assetsListError ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-destructive">
                          Failed to load assets
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {assetsListError}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssetsListError(null);
                          fetchAssetsList();
                        }}
                        disabled={assetsListLoading}
                        className="mt-2"
                      >
                        {assetsListLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                      {assetsList.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No assets available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {assetsList.map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-center space-x-2 py-1"
                            >
                              <Checkbox
                                id={`asset-${asset.id}`}
                                checked={selectedAssets.has(asset.id)}
                                onCheckedChange={() => {
                                  handleAssetToggle(asset.id);
                                  setBatchCreateError(null);
                                }}
                                disabled={batchCreateLoading}
                              />
                              <Label
                                htmlFor={`asset-${asset.id}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                <span className="font-mono text-xs">
                                  {asset.id.slice(0, 8)}...
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  • {asset.status}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {batchCreateError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{batchCreateError}</span>
                  </div>
                )}
                {batchCreateSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span>Batch created and assets assigned successfully</span>
                  </div>
                )}
                <Button
                  onClick={handleCreateBatch}
                  disabled={
                    batchCreateLoading ||
                    !batchLabel.trim() ||
                    selectedAssets.size === 0
                  }
                  className="h-9 w-full"
                >
                  {batchCreateLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Batch & Assign Assets"
                  )}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-indigo-500" />
                  Batch A/B Testing Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {batchAnalyticsLoading && !batchAnalytics ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : batchAnalyticsError ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-destructive">
                        Failed to load batch analytics
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {batchAnalyticsError}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBatchAnalyticsError(null);
                        fetchBatchAnalytics();
                      }}
                      disabled={batchAnalyticsLoading}
                      className="mt-2"
                    >
                      {batchAnalyticsLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </>
                      )}
                    </Button>
                  </div>
                ) : !batchAnalytics ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">
                      No batch analytics available yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Batches
                        </p>
                        <p className="text-2xl font-bold">
                          {batchAnalytics.summary.totalBatches}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Impressions
                        </p>
                        <p className="text-2xl font-bold">
                          {batchAnalytics.summary.totalImpressions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Clicks
                        </p>
                        <p className="text-2xl font-bold">
                          {batchAnalytics.summary.totalClicks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Average CTR
                        </p>
                        <p className="text-2xl font-bold">
                          {batchAnalytics.summary.averageCtr != null &&
                          !isNaN(batchAnalytics.summary.averageCtr)
                            ? batchAnalytics.summary.averageCtr.toFixed(2)
                            : "0.00"}
                          %
                        </p>
                      </div>
                    </div>
                    {batchAnalytics.batches &&
                    batchAnalytics.batches.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Batch Performance
                        </p>
                        <div className="space-y-2">
                          {batchAnalytics.batches.map((batch) => (
                            <div
                              key={batch.batchId}
                              className="flex items-center justify-between text-sm border-b pb-2"
                            >
                              <div className="flex-1">
                                <span className="font-medium">
                                  {batch.batchLabel}
                                </span>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {(
                                    batch.totalImpressions ?? 0
                                  ).toLocaleString()}{" "}
                                  impressions •{" "}
                                  {(batch.totalClicks ?? 0).toLocaleString()}{" "}
                                  clicks
                                </div>
                              </div>
                              <span className="font-medium">
                                {batch.ctr != null && !isNaN(batch.ctr)
                                  ? batch.ctr.toFixed(2)
                                  : "0.00"}
                                % CTR
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No batch performance data available
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-indigo-500" />
                  Batches & Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {batchesListLoading && batchesList.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : batchesListError ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-destructive">
                        Failed to load batches
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {batchesListError}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBatchesListError(null);
                        fetchBatchesList();
                      }}
                      disabled={batchesListLoading}
                      className="mt-2"
                    >
                      {batchesListLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </>
                      )}
                    </Button>
                  </div>
                ) : batchesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">
                      No batches available yet
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <TableHead>Batch Label</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assets</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchesList.map((batch) => {
                        const isExpanded = expandedBatches.has(batch.id);
                        return (
                          <React.Fragment key={batch.id}>
                            <TableRow
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => toggleBatchExpand(batch.id)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {batch.batchLabel}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    batch.status === "active"
                                      ? "default"
                                      : batch.status === "inactive"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {batch.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {batch.assetCount || batch.assets?.length || 0}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(
                                  new Date(batch.createdAt),
                                  "MMM dd, yyyy"
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && batch.assets && (
                              <TableRow>
                                <TableCell colSpan={5} className="p-0">
                                  <div className="bg-muted/30 p-4">
                                    {batch.assets.length === 0 ? (
                                      <p className="text-sm text-muted-foreground text-center py-4">
                                        No assets in this batch
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {batch.assets.map((asset) => {
                                          const removeKey = `${batch.id}-${asset.id}-remove`;
                                          const moveKey = `${batch.id}-${asset.id}-move`;
                                          const isActionLoading =
                                            assetActionLoading.has(removeKey) ||
                                            assetActionLoading.has(moveKey);
                                          return (
                                            <div
                                              key={asset.id}
                                              className="flex items-center justify-between p-3 bg-background rounded-md border"
                                            >
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono text-xs font-medium">
                                                    {asset.id.slice(0, 12)}...
                                                  </span>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                  >
                                                    {asset.status}
                                                  </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  Publisher: {asset.publisherId}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Select
                                                  onValueChange={(
                                                    toBatchId
                                                  ) => {
                                                    handleMoveAsset(
                                                      batch.id,
                                                      asset.id,
                                                      toBatchId
                                                    );
                                                  }}
                                                  disabled={isActionLoading}
                                                >
                                                  <SelectTrigger className="h-8 w-[180px] text-xs">
                                                    <MoveRight className="h-3 w-3 mr-2" />
                                                    <SelectValue placeholder="Move to batch..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {/* Guard: Filter out batches with empty/null/undefined ids to prevent Radix Select error.
                                                        SelectItem cannot have empty string values as Select uses "" to clear selection. */}
                                                    {batchesList.filter(
                                                      (b) =>
                                                        b.id !== batch.id &&
                                                        b.status === "active" &&
                                                        b.id &&
                                                        String(b.id).trim() !==
                                                          ""
                                                    ).length > 0 ? (
                                                      batchesList
                                                        .filter(
                                                          (b) =>
                                                            b.id !== batch.id &&
                                                            b.status ===
                                                              "active" &&
                                                            b.id &&
                                                            String(
                                                              b.id
                                                            ).trim() !== ""
                                                        )
                                                        .map((b) => (
                                                          <SelectItem
                                                            key={b.id}
                                                            value={b.id}
                                                          >
                                                            {b.batchLabel}
                                                          </SelectItem>
                                                        ))
                                                    ) : (
                                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        No other batches
                                                      </div>
                                                    )}
                                                  </SelectContent>
                                                </Select>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveAsset(
                                                      batch.id,
                                                      asset.id
                                                    );
                                                  }}
                                                  disabled={isActionLoading}
                                                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                  {assetActionLoading.has(
                                                    removeKey
                                                  ) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                  )}
                                                </Button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-indigo-500" />
                  Batch Comparison (A vs B)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Batch A
                    </Label>
                    <Select
                      value={batchA}
                      onValueChange={(value) => {
                        setBatchA(value);
                        setComparisonError(null);
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select batch A" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Guard: Filter out batches with empty/null/undefined ids to prevent Radix Select error.
                            SelectItem cannot have empty string values as Select uses "" to clear selection. */}
                        {batchesList.filter(
                          (b) =>
                            b.status === "active" &&
                            b.id !== batchB &&
                            b.id &&
                            String(b.id).trim() !== ""
                        ).length > 0 ? (
                          batchesList
                            .filter(
                              (b) =>
                                b.status === "active" &&
                                b.id !== batchB &&
                                b.id &&
                                String(b.id).trim() !== ""
                            )
                            .map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.batchLabel}
                              </SelectItem>
                            ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No batches available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Batch B
                    </Label>
                    <Select
                      value={batchB}
                      onValueChange={(value) => {
                        setBatchB(value);
                        setComparisonError(null);
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select batch B" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Guard: Filter out batches with empty/null/undefined ids to prevent Radix Select error.
                            SelectItem cannot have empty string values as Select uses "" to clear selection. */}
                        {batchesList.filter(
                          (b) =>
                            b.status === "active" &&
                            b.id !== batchA &&
                            b.id &&
                            String(b.id).trim() !== ""
                        ).length > 0 ? (
                          batchesList
                            .filter(
                              (b) =>
                                b.status === "active" &&
                                b.id !== batchA &&
                                b.id &&
                                String(b.id).trim() !== ""
                            )
                            .map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.batchLabel}
                              </SelectItem>
                            ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No batches available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {comparisonLoading ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : comparisonError ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-destructive">
                        Failed to load comparison data
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {comparisonError}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setComparisonError(null);
                        fetchComparison();
                      }}
                      disabled={comparisonLoading}
                      className="mt-2"
                    >
                      {comparisonLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </>
                      )}
                    </Button>
                  </div>
                ) : !batchA || !batchB || batchA === batchB ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">
                      Select two different batches to compare
                    </p>
                  </div>
                ) : !comparisonData ||
                  (!comparisonData.batchA && !comparisonData.batchB) ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">
                      No comparison data available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {comparisonData.batchA && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-3">
                              Batch A: {comparisonData.batchA.batchLabel}
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Impressions
                                </p>
                                <p className="text-2xl font-bold">
                                  {(
                                    comparisonData.batchA.totalImpressions ?? 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Clicks
                                </p>
                                <p className="text-2xl font-bold">
                                  {(
                                    comparisonData.batchA.totalClicks ?? 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  CTR
                                </p>
                                <p className="text-2xl font-bold">
                                  {comparisonData.batchA.ctr != null &&
                                  !isNaN(comparisonData.batchA.ctr)
                                    ? comparisonData.batchA.ctr.toFixed(2)
                                    : "0.00"}
                                  %
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {comparisonData.batchB && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-3">
                              Batch B: {comparisonData.batchB.batchLabel}
                            </p>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Impressions
                                </p>
                                <p className="text-2xl font-bold">
                                  {(
                                    comparisonData.batchB.totalImpressions ?? 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Clicks
                                </p>
                                <p className="text-2xl font-bold">
                                  {(
                                    comparisonData.batchB.totalClicks ?? 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  CTR
                                </p>
                                <p className="text-2xl font-bold">
                                  {comparisonData.batchB.ctr != null &&
                                  !isNaN(comparisonData.batchB.ctr)
                                    ? comparisonData.batchB.ctr.toFixed(2)
                                    : "0.00"}
                                  %
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {comparisonData.batchA && comparisonData.batchB && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-3">Comparison</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Metric</TableHead>
                              <TableHead className="text-right">
                                Batch A
                              </TableHead>
                              <TableHead className="text-right">
                                Batch B
                              </TableHead>
                              <TableHead className="text-right">
                                Difference
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">
                                Impressions
                              </TableCell>
                              <TableCell className="text-right">
                                {(
                                  comparisonData.batchA.totalImpressions ?? 0
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {(
                                  comparisonData.batchB.totalImpressions ?? 0
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {(
                                  (comparisonData.batchA.totalImpressions ??
                                    0) -
                                  (comparisonData.batchB.totalImpressions ?? 0)
                                ).toLocaleString()}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">
                                Clicks
                              </TableCell>
                              <TableCell className="text-right">
                                {(
                                  comparisonData.batchA.totalClicks ?? 0
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {(
                                  comparisonData.batchB.totalClicks ?? 0
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {(
                                  (comparisonData.batchA.totalClicks ?? 0) -
                                  (comparisonData.batchB.totalClicks ?? 0)
                                ).toLocaleString()}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">CTR</TableCell>
                              <TableCell className="text-right">
                                {comparisonData.batchA.ctr != null &&
                                !isNaN(comparisonData.batchA.ctr)
                                  ? comparisonData.batchA.ctr.toFixed(2)
                                  : "0.00"}
                                %
                              </TableCell>
                              <TableCell className="text-right">
                                {comparisonData.batchB.ctr != null &&
                                !isNaN(comparisonData.batchB.ctr)
                                  ? comparisonData.batchB.ctr.toFixed(2)
                                  : "0.00"}
                                %
                              </TableCell>
                              <TableCell className="text-right">
                                {(() => {
                                  const ctrA = comparisonData.batchA.ctr ?? 0;
                                  const ctrB = comparisonData.batchB.ctr ?? 0;
                                  const diff = ctrA - ctrB;
                                  return isNaN(diff) ? "0.00" : diff.toFixed(2);
                                })()}
                                %
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Throughput</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="success"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Success"
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Failed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <JobTable
                  jobs={data?.recentJobs || []}
                  onReplay={handleReplay}
                />
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedView !== "summary" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedView("summary")}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {selectedView === "summary"
                ? "Operations Dashboard"
                : `${statsConfig.find((s) => s.id === selectedView)?.title} Details`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Auto-updates every 10s • Last updated:{" "}
              {lastUpdated?.toLocaleTimeString() || "..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRefreshing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing Metrics...
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsConfig.map((stat) => (
          <Card
            key={stat.title}
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 ${selectedView === stat.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedView(stat.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon
                className={`h-4 w-4 ${stat.color} ${stat.variant === "destructive" ? "animate-pulse" : ""}`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {renderDetailView()}
    </div>
  );
}

function JobTable({
  jobs,
  onReplay,
}: {
  jobs: BackgroundJob[];
  onReplay: (jobId: string) => void;
}) {
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const toggleExpand = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30px]"></TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead className="text-right">Execution Details</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const isExpanded = expandedJobs.has(job.id);
          return (
            <React.Fragment key={job.id}>
              <TableRow
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleExpand(job.id)}
              >
                <TableCell>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs font-medium">
                  {job.type}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant={
                        job.status === "completed"
                          ? "default"
                          : job.status === "failed"
                            ? "destructive"
                            : job.status === "dead"
                              ? "destructive"
                              : job.status === "running"
                                ? "outline"
                                : "secondary"
                      }
                      className={
                        job.status === "running"
                          ? "animate-pulse border-blue-200 bg-blue-50 text-blue-700"
                          : job.status === "dead"
                            ? "bg-gray-900 text-white hover:bg-gray-800"
                            : ""
                      }
                    >
                      {job.status === "dead" ? "Dead Letter" : job.status}
                    </Badge>
                    {job.retryCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Retry: {job.retryCount}/{job.maxRetries || 5}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {job.progress} / {job.total}
                    </span>
                    <div className="h-1.5 w-full max-w-[100px] rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{
                          width: `${job.total && job.total > 0 && job.progress ? (job.progress / job.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(job.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    {job.durationMs && (
                      <span className="text-xs font-mono">
                        {job.durationMs}ms
                      </span>
                    )}
                    {job.error && (
                      <span
                        className="text-[10px] text-red-500 max-w-[150px] truncate"
                        title={job.error}
                      >
                        {job.error}
                      </span>
                    )}
                    {job.deadLetteredAt && (
                      <span className="text-[10px] text-gray-500">
                        DLQ: {new Date(job.deadLetteredAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {(job.status === "failed" || job.status === "dead") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplay(job.id);
                      }}
                      title="Replay Job"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={7}>
                    <div className="p-4 space-y-4">
                      {job.error && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Error Details
                          </h4>
                          <div className="text-xs font-mono bg-red-50 text-red-900 p-2 rounded border border-red-100 whitespace-pre-wrap">
                            {job.error}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-muted-foreground">
                            Payload
                          </h4>
                          <pre className="text-[10px] font-mono bg-background p-2 rounded border overflow-auto max-h-[200px]">
                            {JSON.stringify(job.payload, null, 2)}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-muted-foreground">
                            Result
                          </h4>
                          <pre className="text-[10px] font-mono bg-background p-2 rounded border overflow-auto max-h-[200px]">
                            {job.result ? (
                              JSON.stringify(job.result, null, 2)
                            ) : (
                              <span className="text-muted-foreground italic">
                                No result data
                              </span>
                            )}
                          </pre>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground border-t pt-4">
                        <div>
                          <span className="font-semibold block">Job ID</span>
                          <span className="font-mono">{job.id}</span>
                        </div>
                        <div>
                          <span className="font-semibold block">Attempts</span>
                          <span>
                            {job.retryCount} / {job.maxRetries || 5}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold block">Next Run</span>
                          <span>
                            {job.nextRunAt
                              ? new Date(job.nextRunAt).toLocaleString()
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold block">
                            Finished At
                          </span>
                          <span>
                            {job.finishedAt
                              ? new Date(job.finishedAt).toLocaleString()
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
        {jobs.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-center py-10 text-muted-foreground italic"
            >
              No jobs matching this criteria
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
