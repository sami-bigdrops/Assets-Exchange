import { getTableName } from "drizzle-orm";

import { creativeRequests } from "@/lib/schema";

/**
 * A simple script to verify that the schema import works correctly.
 * This file should not contain binary characters.
 */

async function main() {
  console.warn("Starting schema import test...");

  if (creativeRequests) {
    console.warn("Successfully imported creativeRequests schema object.");
    console.warn("Table Name:", getTableName(creativeRequests));
  } else {
    console.error("Failed to import creativeRequests: object is undefined.");
    process.exit(1);
  }

  console.warn("Schema verification complete.");
}

main().catch((err) => {
  console.error("Error running schema test:", err);
  process.exit(1);
});
