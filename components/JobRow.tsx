"use client";

import { format } from "date-fns";
import { RefreshCw, XCircle, Eye } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { TableCell, TableRow } from "@/components/ui/table";

import JobTimeline from "./JobTimeline";


interface SimpleButtonProps {
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
    variant?: "default" | "destructive" | "outline" | "ghost" | "secondary";
}

function SimpleButton({ onClick, disabled, className, children, variant }: SimpleButtonProps) {
    const base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
    const variants = {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${variants[variant ?? "default"]} ${className ?? ""}`}
        >
            {children}
        </button>
    )
}

interface Job {
    id: string;
    type: string;
    status: string;
    progress: number;
    total: number;
    attempt: number;
    maxAttempts: number;
    errorType?: string | null;
    nextRunAt?: string | Date | null;
    error?: string | null;
    payload?: Record<string, unknown> | null;
    result?: Record<string, unknown> | null;
}

export default function JobRow({ job, onRefresh }: { job: Job, onRefresh: () => void }) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleRetry = async () => {
        if (!confirm("Are you sure you want to manually retry this job?")) return;
        setLoading(true);
        try {
            await fetch(`/api/admin/jobs/${job.id}/retry`, { method: "POST" });
            onRefresh();
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this job?")) return;
        setLoading(true);
        try {
            await fetch(`/api/admin/jobs/${job.id}/cancel`, { method: "POST" });
            onRefresh();
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const isRetryable = job.status === 'failed' || (job.status === 'pending' && job.nextRunAt);
    const isCancellable = job.status === 'pending' || job.status === 'running';

    return (
        <TableRow className="cursor-pointer hover:bg-muted/50">
            <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}...</TableCell>
            <TableCell className="font-medium">{job.type}</TableCell>
            <TableCell>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        job.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            job.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                                job.status === 'getting_ready' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}
                `}>
                    {job.status.replace('_', ' ')}
                </div>
            </TableCell>
            <TableCell>
                {job.total > 0 ? (
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-800">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(job.progress / job.total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round((job.progress / job.total) * 100)}%</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )}
            </TableCell>
            <TableCell className="text-xs">
                {job.attempt} <span className="text-muted-foreground">/ {job.maxAttempts}</span>
            </TableCell>
            <TableCell>
                {job.errorType ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-mono">
                        {String(job.errorType)}
                    </span>
                ) : '-'}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                {job.nextRunAt ? format(new Date(job.nextRunAt), "HH:mm:ss") : '-'}
            </TableCell>
            <TableCell>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <SimpleButton variant="ghost" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                        </SimpleButton>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-xl overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Job Details</SheetTitle>
                            <SheetDescription>ID: {job.id}</SheetDescription>
                        </SheetHeader>

                        <div className="mt-6 space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Status</div>
                                    <div className="capitalize font-medium text-lg mt-1">{job.status}</div>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Type</div>
                                    <div className="font-medium text-lg mt-1">{job.type}</div>
                                </div>
                            </div>

                            {/* Error Section */}
                            {job.error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
                                    <div className="text-xs font-semibold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2">Failure Reason</div>
                                    <p className="text-sm text-red-700 dark:text-red-300 font-mono break-all">{String(job.error)}</p>
                                    {job.errorType && (
                                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200">
                                            Type: {String(job.errorType)}
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <SimpleButton
                                    onClick={handleRetry}
                                    disabled={!isRetryable || loading}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    Retry Job
                                </SimpleButton>

                                <SimpleButton
                                    onClick={handleCancel}
                                    disabled={!isCancellable || loading}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Job
                                </SimpleButton>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h3 className="text-sm font-semibold mb-4">Event Timeline</h3>
                                <JobTimeline jobId={job.id} />
                            </div>

                            {/* Payload/Result Inspector */}
                            {job.payload && (
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-semibold mb-2">Payload</h3>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                        {JSON.stringify(job.payload ?? {}, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {job.result && (
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-semibold mb-2">Result</h3>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                        {JSON.stringify(job.result ?? {}, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </TableCell>
        </TableRow>
    );
}
