import { logger } from "@/lib/logger";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const otlpBase = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318").replace(
  /\/v1\/traces\/?$/,
  "",
);
const otlpUrl = `${otlpBase}/v1/traces`;

export const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "food-service",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
  }),
  traceExporter: new OTLPTraceExporter({
    url: otlpUrl,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        enabled: true,
      },
    }),
    new PrismaInstrumentation(),
  ],
});

export function startOtel() {
  otelSDK.start();
  logger.info({ otelEndpoint: otlpUrl }, "OpenTelemetry SDK started");
}

export function stopOtel() {
  otelSDK.shutdown();
  logger.info("OpenTelemetry SDK shut down");
}
