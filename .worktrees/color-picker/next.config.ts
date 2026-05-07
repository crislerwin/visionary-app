import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {
    root: ".",
  },
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  images: {
    remotePatterns: [
      // MinIO / S3-compatible
      { protocol: "http", hostname: "192.168.3.55", port: "9000" },
      { protocol: "https", hostname: "192.168.3.55", port: "9000" },
      // AWS S3 virtual-hosted-style buckets
      { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      // Generic fallback
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
