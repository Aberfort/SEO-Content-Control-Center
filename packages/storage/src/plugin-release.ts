import type { ObjectStore } from "./types";

export type PluginReleaseManifest = {
  version: string;
  objectKey: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
};

const manifestKey = "wordpress-plugin/latest.json";

function objectKeyForVersion(version: string): string {
  return `wordpress-plugin/releases/${version}/content-signal-seo-content-audit-${version}.zip`;
}

/**
 * Uploads a certified plugin release archive and overwrites the "latest"
 * manifest to point at it. Called from scripts/publish-wordpress-plugin-release.mjs
 * after scripts/certify-plugin-release.sh has produced and verified the zip.
 */
export async function publishPluginRelease(
  store: ObjectStore,
  input: {
    version: string;
    archive: Buffer;
    sha256: string;
    publishedAt?: string;
  }
): Promise<PluginReleaseManifest> {
  const objectKey = objectKeyForVersion(input.version);
  const filename = `content-signal-seo-content-audit-${input.version}.zip`;

  await store.putObject({
    key: objectKey,
    body: input.archive,
    contentType: "application/zip"
  });

  const manifest: PluginReleaseManifest = {
    version: input.version,
    objectKey,
    filename,
    sha256: input.sha256,
    sizeBytes: input.archive.byteLength,
    publishedAt: input.publishedAt ?? new Date().toISOString()
  };

  await store.putObject({
    key: manifestKey,
    body: Buffer.from(JSON.stringify(manifest, null, 2)),
    contentType: "application/json"
  });

  return manifest;
}

/**
 * Returns null (not a thrown error) when nothing has been published yet, so
 * the marketing download page can fall back to its static link instead of
 * breaking in an environment where the publish step has never run.
 */
export async function getLatestPluginRelease(
  store: ObjectStore
): Promise<PluginReleaseManifest | null> {
  const raw = await store.getObjectText(manifestKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PluginReleaseManifest;
  } catch {
    return null;
  }
}

export async function getPluginDownloadUrl(
  store: ObjectStore,
  manifest: PluginReleaseManifest,
  expiresInSeconds = 300
): Promise<string> {
  return store.getPresignedDownloadUrl({
    key: manifest.objectKey,
    filename: manifest.filename,
    expiresInSeconds
  });
}
