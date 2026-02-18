/* eslint-disable import/order */
import { config } from "dotenv";

config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function main() {
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'annotations';
  `);
  // eslint-disable-next-line no-console
  console.log("Annotations table columns:", result.rows);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
