import { db } from "@/lib/db";
import { backgroundJobEvents } from "@/lib/schema";

export const JobEventType = {
    STARTED: 'started',
    PROGRESS: 'progress',
    CHUNK: 'chunk_processed',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    COMPLETED: 'completed',
} as const;

export async function logJobEvent({
    jobId,
    type,
    message,
    data,
    tx,
}: {
    jobId: string;
    type: string;
    message?: string;
    data?: any;
    tx?: any;
}) {
    try {
        const database = tx || db;
        await database.insert(backgroundJobEvents).values({
            jobId,
            type,
            message,
            data,
        });
    } catch (error) {
        console.error(`Failed to log job event ${type} for job ${jobId}:`, error);
    }
}
