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
  const provider = (process.env.STORAGE_PROVIDER as "s3" | "minio" | "local") || "local";

  if (provider === "s3") {
    return {
      provider: "s3",
      region: process.env.AWS_REGION || "us-east-1",
      bucket: process.env.AWS_S3_BUCKET || "food-service-images",
      endpoint: process.env.AWS_S3_ENDPOINT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  if (provider === "minio") {
    const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
    return {
      provider: "minio",
      endpoint,
      publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT || endpoint,
      bucket: process.env.MINIO_BUCKET || "food-service-images",
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
      useSsl: process.env.MINIO_USE_SSL === "true",
    };
  }

  return {
    provider: "local",
    bucket: "uploads",
    localPath: process.env.LOCAL_UPLOAD_PATH || "./public/uploads",
    localPublicUrl: process.env.LOCAL_PUBLIC_URL || "/uploads",
  };
}
