import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { env } from "@/env";

import { logger } from "./logger";
import * as schema from "./schema";

neonConfig.fetchConnectionCache = true;

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

// Log database connection on first import
if (process.env.NODE_ENV === "development") {
  logger.db.info("Database connection pool initialized");
}
