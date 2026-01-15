import "server-only";
import pino from "pino";
import { getRequestId } from "./requestContext";

const rootLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  mixin() {
    return { requestId: getRequestId() };
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
    ],
    censor: "[REDACTED]",
  },
});

type ChildLogger = pino.Logger & {
  success: pino.LogFn;
};

const createChildLogger = (module: string): ChildLogger => {
  const child = rootLogger.child({ module }) as unknown as ChildLogger;
  child.success = child.info.bind(child);
  return child;
};

export const logger = Object.assign(rootLogger, {
  auth: createChildLogger("auth"),
  rpc: createChildLogger("rpc"),
  app: createChildLogger("app"),
  everflow: createChildLogger("everflow"),
});

export const withJobContext = (jobId: string) => {
  return createChildLogger("job").child({ jobId });
};
