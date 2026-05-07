import { existsSync } from "node:fs";
import { chmod, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageConfig, StorageProvider } from "./types";

export class LocalStorage implements StorageProvider {
  private basePath: string;
  private publicUrl: string;

  constructor(config: StorageConfig) {
    this.basePath = config.localPath || "./public/uploads";
    this.publicUrl = config.localPublicUrl || "/uploads";
  }

  async upload(file: Buffer, key: string, _contentType: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    const dir = path.dirname(fullPath);

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true, mode: 0o755 });
    }

    // Ensure the base upload directory is writable by all (fixes Docker vs local dev ownership issues)
    try {
      await chmod(this.basePath, 0o777);
    } catch {
      // Ignore if we don't have permission to chmod the base path
    }

    await writeFile(fullPath, file);
    return this.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    try {
      await unlink(fullPath);
    } catch (_error) {
      // File might not exist
    }
  }

  async getPresignedUrl(key: string): Promise<string> {
    // For local storage, we don't need presigned URLs
    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
