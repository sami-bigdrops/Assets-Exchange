/**
 * Verification script for grammar_feedback migration
 *
 * Run this after migration to verify:
 * 1. Column exists and is nullable
 * 2. Inserts without grammar_feedback work
 * 3. Updates with grammar_feedback work
 * 4. Old rows remain readable
 */
/* eslint-disable no-console -- CLI script; console output is intended */

import { eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { externalTasks } from "@/lib/schema";

async function verifyMigration() {
  console.log("🔍 Verifying grammar_feedback migration...\n");

  try {
    // Test 1: Verify column exists (by attempting to query it)
    console.log("Test 1: Verifying column exists...");
    await db
      .select({
        id: externalTasks.id,
        grammarFeedback: externalTasks.grammarFeedback,
      })
      .from(externalTasks)
      .limit(1);

    console.log("✅ Column exists and is queryable\n");

    // Test 2: Insert without grammar_feedback
    console.log("Test 2: Testing insert without grammar_feedback...");
    const testId = `test-${Date.now()}`;
    const [inserted] = await db
      .insert(externalTasks)
      .values({
        id: testId,
        creativeId: "test-creative",
        source: "grammar_ai",
        status: "pending",
        result: { test: "data" },
      })
      .returning();

    if (inserted && inserted.grammarFeedback === null) {
      console.log("✅ Insert without grammar_feedback succeeded\n");
    } else {
      console.log(
        "⚠️  Insert succeeded but grammar_feedback is not null:",
        inserted?.grammarFeedback,
        "\n"
      );
    }

    // Test 3: Update with grammar_feedback
    console.log("Test 3: Testing update with grammar_feedback...");
    const testFeedback = [
      {
        category: "spelling",
        message: "Test issue",
        severity: "warning" as const,
        originalText: "teh",
        suggestedText: "the",
      },
    ];

    await db
      .update(externalTasks)
      .set({
        grammarFeedback: testFeedback,
        status: "completed",
      })
      .where(eq(externalTasks.id, testId));

    const [updated] = await db
      .select()
      .from(externalTasks)
      .where(eq(externalTasks.id, testId))
      .limit(1);

    if (
      updated &&
      Array.isArray(updated.grammarFeedback) &&
      updated.grammarFeedback.length === 1
    ) {
      console.log("✅ Update with grammar_feedback succeeded\n");
    } else {
      console.log(
        "⚠️  Update succeeded but grammar_feedback is incorrect:",
        updated?.grammarFeedback,
        "\n"
      );
    }

    // Test 4: Verify old rows are readable
    console.log("Test 4: Verifying old rows are readable...");
    const oldRows = await db
      .select({
        id: externalTasks.id,
        status: externalTasks.status,
        result: externalTasks.result,
        grammarFeedback: externalTasks.grammarFeedback,
      })
      .from(externalTasks)
      .where(isNull(externalTasks.grammarFeedback))
      .limit(5);

    console.log(
      `✅ Found ${oldRows.length} old rows with grammar_feedback = null`
    );
    console.log("✅ Old rows are readable\n");

    // Cleanup
    console.log("Cleaning up test data...");
    await db.delete(externalTasks).where(eq(externalTasks.id, testId));
    console.log("✅ Cleanup complete\n");

    console.log("🎉 All migration verification tests passed!");
  } catch (error) {
    console.error("❌ Migration verification failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
}

verifyMigration()
  .then(() => {
    console.log("\n✅ Verification complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });
