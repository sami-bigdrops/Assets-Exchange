import "server-only";

const logger = {
  app: {
    info: (...args: unknown[]) => console.log("[APP]", ...args),
    success: (...args: unknown[]) => console.log("[APP] ✓", ...args),
    warn: (...args: unknown[]) => console.warn("[APP] ⚠", ...args),
    error: (...args: unknown[]) => console.error("[APP] ✗", ...args),
    debug: (...args: unknown[]) => {
      if (process.env.NODE_ENV === "development") {
        console.debug("[APP]", ...args);
      }
    },
  },
  api: {
    info: (...args: unknown[]) => console.log("[API]", ...args),
    success: (...args: unknown[]) => console.log("[API] ✓", ...args),
    warn: (...args: unknown[]) => console.warn("[API] ⚠", ...args),
    error: (...args: unknown[]) => console.error("[API] ✗", ...args),
  },
  db: {
    info: (...args: unknown[]) => console.log("[DB]", ...args),
    success: (...args: unknown[]) => console.log("[DB] ✓", ...args),
    warn: (...args: unknown[]) => console.warn("[DB] ⚠", ...args),
    error: (...args: unknown[]) => console.error("[DB] ✗", ...args),
  },
  auth: {
    info: (...args: unknown[]) => console.log("[AUTH]", ...args),
    success: (...args: unknown[]) => console.log("[AUTH] ✓", ...args),
    warn: (...args: unknown[]) => console.warn("[AUTH] ⚠", ...args),
    error: (...args: unknown[]) => console.error("[AUTH] ✗", ...args),
  },
  rpc: {
    info: (...args: unknown[]) => console.log("[RPC]", ...args),
    success: (...args: unknown[]) => console.log("[RPC] ✓", ...args),
    warn: (...args: unknown[]) => console.warn("[RPC] ⚠", ...args),
    error: (...args: unknown[]) => console.error("[RPC] ✗", ...args),
  },
};

export { logger };
export default logger.app;
