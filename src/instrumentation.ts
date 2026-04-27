import { logger } from "@/lib/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logger.info(
      { nodeVersion: process.version, runtime: process.env.NEXT_RUNTIME },
      "Next.js instrumentation register started",
    );
    const { startOtel } = await import("@/lib/otel");
    startOtel();
  }
}
