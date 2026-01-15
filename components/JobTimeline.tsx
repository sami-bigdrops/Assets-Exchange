"use client";

import { format } from "date-fns";
import { useState, useEffect } from "react";

interface JobEvent {
    id: string;
    type: string;
    message?: string | null;
    data?: Record<string, unknown> | null;
    createdAt: string | Date;
}

export default function JobTimeline({ jobId }: { jobId: string }) {
    const [events, setEvents] = useState<JobEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/jobs/${jobId}/events`)
            .then((r) => r.json())
            .then((data) => {
                setEvents(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [jobId]);

    if (loading) {
        return <div className="text-sm text-gray-500">Loading events...</div>;
    }

    if (events.length === 0) {
        return <div className="text-sm text-gray-500">No events found.</div>;
    }

    return (
        <ul className="space-y-4">
            {events.map((e) => (
                <li key={e.id} className="relative pl-6 border-l border-gray-200 dark:border-gray-800 last:border-0 pb-4 last:pb-0">
                    <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-gray-400 dark:bg-gray-600 ring-4 ring-white dark:ring-gray-950" />
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 font-mono">
                                {format(new Date(e.createdAt), "HH:mm:ss")}
                            </span>
                            <span className={`text-sm font-semibold px-2 py-0.5 rounded-full text-xs box-content
                    ${e.type === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                    e.type === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        e.type === 'STARTED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            e.type === 'retry_scheduled' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
                `}>
                                {e.type}
                            </span>
                        </div>
                        {e.message && <p className="text-sm text-gray-700 dark:text-gray-300">{e.message}</p>}
                        {e.data && (
                            <pre className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto mt-1 max-w-full">
                                {JSON.stringify(e.data ?? {}, null, 2)}
                            </pre>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
