import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { backgroundJobs, backgroundJobEvents } from "../lib/schema";

async function verifyRollback() {
    console.log("Creation test job...");
    const [job] = await db.insert(backgroundJobs).values({
        type: "test_rollback",
        status: "pending",
        payload: { test: true },
    }).returning();

    console.log(`Created job ${job.id} with status ${job.status}`);

    console.log("Attempting transaction with error...");
    try {
        await db.transaction(async (tx) => {
            await tx.update(backgroundJobs)
                .set({ status: "completed", finishedAt: new Date() })
                .where(eq(backgroundJobs.id, job.id));

            console.log("Updated job status to completed (in-tx)");

            await tx.insert(backgroundJobEvents).values({
                jobId: job.id,
                type: "test_event",
                message: "This should not exist",
            });
            console.log("Inserted event (in-tx)");

            throw new Error("Simulated Failure");
        });
    } catch (e: any) {
        console.log(`Caught expected error: ${e.message}`);
    }

    const [updatedJob] = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, job.id));
    const events = await db.select().from(backgroundJobEvents).where(eq(backgroundJobEvents.jobId, job.id));

    console.log("--- Verification Results ---");
    console.log(`Job Status: ${updatedJob.status}`);
    console.log(`Events Found: ${events.length}`);

    if (updatedJob.status === "pending" && events.length === 0) {
        console.log("✅ SUCCESS: Transaction rolled back correctly.");
    } else {
        console.log("❌ FAILURE: Transaction did not roll back.");
        if (updatedJob.status !== "pending") console.log(`Expected status 'pending', got '${updatedJob.status}'`);
        if (events.length !== 0) console.log(`Expected 0 events, got ${events.length}`);
    }

    await db.delete(backgroundJobs).where(eq(backgroundJobs.id, job.id));
    console.log("Cleaned up test job.");
}

verifyRollback().catch(console.error).then(() => process.exit(0));
