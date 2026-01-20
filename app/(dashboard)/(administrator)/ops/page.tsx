"use client";

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
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { backgroundJobs } from "@/lib/schema";

type BackgroundJob = typeof backgroundJobs.$inferSelect;

interface OpsMetrics {
  stats: {
    activeJobs: number;
    failedJobs24h: number;
    deadJobs: number;
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
  recentJobs: BackgroundJob[];
}

type ViewType =
  | "summary"
  | "active"
  | "failed"
  | "dead"
  | "error-rate"
  | "latency";

export default function OpsPage() {
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedView, setSelectedView] = useState<ViewType>("summary");
  const [isMounted, setIsMounted] = useState(false);

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

  useEffect(() => {
    fetchMetrics(true);
    const interval = setInterval(() => fetchMetrics(), 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

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
      id: "error-rate" as ViewType,
      title: "Error Rate",
      value: `${data?.stats.errorRate || "0"}%`,
      icon: Database,
      description: "Last 24h",
      color: "text-orange-500",
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <>
              <TableRow
                key={job.id}
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
            </>
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
