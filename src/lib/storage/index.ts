import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { StorageConfig, StorageProvider } from "./types";

export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "s3":
      return new S3Storage(config);
    case "minio":
      // MinIO uses the same S3 client
      return new S3Storage({
        ...config,
        endpoint: config.endpoint,
      });
    default:
      return new LocalStorage(config);
  }
}

export * from "./types";
export { S3Storage, LocalStorage };
