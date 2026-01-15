"use client";

import { RefreshCcw } from "lucide-react";
import { useState, useEffect } from "react";

import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";

import JobRow from "./JobRow";

export default function JobsTable() {
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

    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/jobs");
            const data = await res.json();
            if (Array.isArray(data)) {
                setJobs(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Auto-refreshes every 5s
                </div>
                <button
                    onClick={fetchJobs}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                    title="Refresh Now"
                >
                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Attempts</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Next Retry</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && jobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Loading jobs...
                                </TableCell>
                            </TableRow>
                        ) : jobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No jobs found
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobs.map((job) => (
                                <JobRow key={job.id} job={job} onRefresh={fetchJobs} />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
