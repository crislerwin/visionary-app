import https from "node:https";
import { logger } from "@/lib/logger";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import type { StorageConfig, StorageProvider } from "./types";

export class S3Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private endpoint: string | undefined;
  private publicEndpoint: string | undefined;
  private isMinio: boolean;

  constructor(config: StorageConfig) {
    const isMinio = config.provider === "minio";
    const useSsl = config.useSsl !== false;

    // Custom HTTPS agent for MinIO with optional SSL verification skip
    const requestHandler =
      isMinio && useSsl && process.env.MINIO_SSL_VERIFY === "false"
        ? new NodeHttpHandler({
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          })
        : undefined;

    this.client = new S3Client({
      region: config.region || "us-east-1",
      endpoint: config.endpoint,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
      forcePathStyle: isMinio,
      ...(requestHandler ? { requestHandler } : {}),
    });
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
    this.publicEndpoint = config.publicEndpoint;
    this.isMinio = isMinio;
  }

  async upload(file: Buffer, key: string, contentType: string): Promise<string> {
    logger.info(
      { bucket: this.bucket, key, contentType, endpoint: this.endpoint, isMinio: this.isMinio },
      "[S3Storage] Uploading",
    );

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    try {
      await this.client.send(command);
      logger.info({ key }, "[S3Storage] Upload successful");
    } catch (error) {
      logger.error({ err: error, key }, "[S3Storage] Upload failed");
      throw error;
    }

    return this.getPublicUrl(key);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  getPublicUrl(key: string): string {
    if (this.isMinio) {
      // MinIO uses path-style URLs: http://endpoint/bucket/key
      const base = (this.publicEndpoint || this.endpoint || "http://localhost:9000").replace(
        /\/$/,
        "",
      );
      return `${base}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
  }
}
