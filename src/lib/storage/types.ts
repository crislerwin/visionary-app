import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(): Record<string, string> {
  try {
    const envPath = join(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

const dotEnv = loadEnv();

function env(key: string, fallback: string): string {
  return process.env[key] || dotEnv[key] || fallback;
}

function envBool(key: string): boolean {
  return process.env[key] === "true" || dotEnv[key] === "true";
}

export interface StorageProvider {
  upload(file: Buffer, key: string, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
  getPublicUrl(key: string): string;
}

export interface StorageConfig {
  provider: "s3" | "minio" | "local";
  // S3/MinIO
  endpoint?: string;
  publicEndpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  useSsl?: boolean;
  // Local
  localPath?: string;
  localPublicUrl?: string;
}

export function getStorageConfig(): StorageConfig {
  const provider = env("STORAGE_PROVIDER", "local") as "s3" | "minio" | "local";

  if (provider === "s3") {
    return {
      provider: "s3",
      region: env("AWS_REGION", "us-east-1"),
      bucket: env("AWS_S3_BUCKET", "food-service-images"),
      endpoint: process.env.AWS_S3_ENDPOINT || dotEnv.AWS_S3_ENDPOINT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || dotEnv.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || dotEnv.AWS_SECRET_ACCESS_KEY,
    };
  }

  if (provider === "minio") {
    const endpoint = env("MINIO_ENDPOINT", "http://localhost:9000");
    return {
      provider: "minio",
      endpoint,
      publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || dotEnv.MINIO_PUBLIC_ENDPOINT || endpoint,
      bucket: env("MINIO_BUCKET", "food-service-images"),
      accessKeyId: env("MINIO_ACCESS_KEY", "minioadmin"),
      secretAccessKey: env("MINIO_SECRET_KEY", "minioadmin"),
      useSsl: envBool("MINIO_USE_SSL"),
    };
  }

  return {
    provider: "local",
    bucket: "uploads",
    localPath: env("LOCAL_UPLOAD_PATH", "./public/uploads"),
    localPublicUrl: env("LOCAL_PUBLIC_URL", "/uploads"),
  };
}
