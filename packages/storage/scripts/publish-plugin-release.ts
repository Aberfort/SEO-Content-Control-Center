#!/usr/bin/env tsx
/**
 * Uploads the certified WordPress plugin archive (built by
 * scripts/build-wordpress-plugin.sh and verified by
 * scripts/certify-plugin-release.sh) to object storage, and updates the
 * "latest" manifest the marketing download page reads. Mirrors the
 * dist-dir/version/archive-name conventions from
 * scripts/certify-plugin-release.sh so both scripts agree on where the
 * artifact lives without one calling the other.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createS3ObjectStore, publishPluginRelease, readS3ConfigFromEnv } from "../src/index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const config = readS3ConfigFromEnv();

  if (!config) {
    console.error(
      "[plugin-publish] Object storage is not configured. Set S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY before publishing."
    );
    process.exitCode = 1;
    return;
  }

  const versionFile = path.join(repositoryRoot, "wordpress-plugin", "VERSION");
  const version = (await readFile(versionFile, "utf8")).trim();
  const distDir = process.env.SCCC_PLUGIN_DIST_DIR ?? path.join(repositoryRoot, "dist");
  const archivePath = path.join(
    distDir,
    `content-signal-seo-content-audit-${version}.zip`
  );

  let archive: Buffer;

  try {
    archive = await readFile(archivePath);
  } catch {
    console.error(
      `[plugin-publish] Could not read the plugin archive at ${archivePath}. Run npm run plugin:release:certify first.`
    );
    process.exitCode = 1;
    return;
  }

  const sha256 = createHash("sha256").update(archive).digest("hex");
  const store = createS3ObjectStore(config);
  const manifest = await publishPluginRelease(store, { version, archive, sha256 });

  console.log("[plugin-publish] Published plugin release.");
  console.log(`  Version: ${manifest.version}`);
  console.log(`  Object key: ${manifest.objectKey}`);
  console.log(`  SHA256: ${manifest.sha256}`);
  console.log(`  Size bytes: ${manifest.sizeBytes}`);
  console.log(`  Published at: ${manifest.publishedAt}`);
}

main().catch((error: unknown) => {
  console.error("[plugin-publish] Failed:", error);
  process.exitCode = 1;
});
