import { NextResponse } from "next/server";

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
  };

  return NextResponse.json(health, { status: 200 });
}

// Kubernetes readiness probe
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
