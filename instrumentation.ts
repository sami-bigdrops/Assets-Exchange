import { logger } from "./lib/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const env = process.env.NODE_ENV || "development";
    const port = process.env.PORT || "3000";

    logger.app.info("Server instrumentation loaded");

    // Show startup message after Next.js is ready
    setImmediate(() => {
      setTimeout(() => {
        logger.app.info(
          `\n✨ Development Server\n\n🚀 Assets Exchange\n\nEnvironment: ${env}\nPort: ${port}\nFramework: Next.js 15.5.7\nBuild Tool: Turbopack\n\nLocal:    http://localhost:${port}\nNetwork:  http://192.168.1.2:${port}\n`
        );
        logger.app.success("Server ready!");
        logger.app.info("Happy coding! 🎉\n");
      }, 2000);
    });
  }
}
