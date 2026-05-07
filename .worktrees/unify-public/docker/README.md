# LGTM Stack Configuration

The project uses the official **Grafana OTLM (OpenTelemetry LGTM)** all-in-one image:
`grafana/otel-lgtm:latest`.

## Architecture

| Component | Purpose | Port (Host) |
|-----------|---------|-------------|
| Grafana | Dashboards & Explore | 3001 |
| Tempo | Distributed tracing | internal (via OTLP) |
| Mimir | Metrics storage | 9090 (Prometheus-compatible) |
| Alloy | OTel Collector (receives OTLP, routes to backends) | 4318 (HTTP) |

## How it works

1. **Next.js app** sends traces and metrics via OTLP HTTP to `http://localhost:4318`
2. **Grafana Alloy** (running inside the container):
   - Receives OTLP payloads
   - Routes **traces** → Tempo
   - Routes **metrics** → Mimir
3. **Grafana UI** (`localhost:3001`) is pre-configured with datasources for Tempo and Mimir

## Logs

⚠️ **OTLP logs to Loki:** The `grafana/otel-lgtm` image currently does not expose a functional OTLP endpoint for Loki (tracked in [docker-otel-lgtm#35](https://github.com/grafana/docker-otel-lgtm/issues/35)). Apps should log to stdout; use `docker logs` or configure Loki's Promtail/Docker logging driver separately if log aggregation is required.

## Quick Start

```bash
# Start everything
npm run docker:up

# View dashboards
open http://localhost:3001
# login: admin / admin

# Stop
npm run docker:down
```

## App Configuration

Environment variables (auto-detected):
```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

No manual datasource provisioning needed — the all-in-one image comes pre-configured.