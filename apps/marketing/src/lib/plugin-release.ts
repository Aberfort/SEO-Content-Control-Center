import { createS3ObjectStore, readS3ConfigFromEnv, type ObjectStore } from "@sccc/storage";

/**
 * Returns null when object storage isn't configured (S3_* env vars unset),
 * so the download page and its API route can fall back to the static
 * committed zip instead of breaking in environments where
 * `npm run plugin:release:publish` has never been run.
 */
export function getPluginObjectStore(env: NodeJS.ProcessEnv = process.env): ObjectStore | null {
  const config = readS3ConfigFromEnv(env);
  return config ? createS3ObjectStore(config) : null;
}
