import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { ObjectStore } from "./types";

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/**
 * Reads the shared S3_* env vars used by both the SaaS and marketing apps.
 * Returns null when object storage isn't configured, so callers can degrade
 * gracefully instead of throwing (mirrors isMonitoringWorkerConfigured /
 * isDeliverablesWorkerConfigured in apps/worker).
 */
export function readS3ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): S3Config | null {
  const endpoint = env.S3_ENDPOINT?.trim();
  const region = env.S3_REGION?.trim();
  const bucket = env.S3_BUCKET?.trim();
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

export function createS3ObjectStore(config: S3Config): ObjectStore {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    // Required for MinIO and most other S3-compatible endpoints; AWS itself
    // also accepts path-style requests, so this is safe in both targets.
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  return {
    async putObject(input) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType
        })
      );
    },
    async getObjectText(key) {
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: config.bucket, Key: key })
        );
        return (await result.Body?.transformToString()) ?? null;
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw error;
      }
    },
    async getPresignedDownloadUrl(input) {
      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: input.key,
        ResponseContentDisposition: input.filename
          ? `attachment; filename="${input.filename}"`
          : undefined
      });

      return getSignedUrl(client, command, { expiresIn: input.expiresInSeconds });
    }
  };
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "NoSuchKey"
  );
}
