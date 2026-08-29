import { describe, expect, it } from "vitest";

import { getLatestPluginRelease, getPluginDownloadUrl, publishPluginRelease } from "../src/plugin-release";
import type { ObjectStore } from "../src/types";

function createFakeObjectStore(): { store: ObjectStore; objects: Map<string, Buffer> } {
  const objects = new Map<string, Buffer>();
  const store: ObjectStore = {
    async putObject(input) {
      objects.set(input.key, input.body);
    },
    async getObjectText(key) {
      const value = objects.get(key);
      return value ? value.toString("utf8") : null;
    },
    async getPresignedDownloadUrl(input) {
      return `https://example-bucket.local/${input.key}?expires=${input.expiresInSeconds}`;
    }
  };

  return { store, objects };
}

describe("publishPluginRelease", () => {
  it("uploads the archive under a versioned key and writes a latest manifest", async () => {
    const { store, objects } = createFakeObjectStore();
    const archive = Buffer.from("fake-zip-bytes");

    const manifest = await publishPluginRelease(store, {
      version: "0.9.0",
      archive,
      sha256: "deadbeef",
      publishedAt: "2026-08-28T00:00:00.000Z"
    });

    expect(manifest).toEqual({
      version: "0.9.0",
      objectKey: "wordpress-plugin/releases/0.9.0/content-signal-seo-content-audit-0.9.0.zip",
      filename: "content-signal-seo-content-audit-0.9.0.zip",
      sha256: "deadbeef",
      sizeBytes: archive.byteLength,
      publishedAt: "2026-08-28T00:00:00.000Z"
    });
    expect(objects.get(manifest.objectKey)).toEqual(archive);
    expect(JSON.parse(objects.get("wordpress-plugin/latest.json")!.toString("utf8"))).toEqual(
      manifest
    );
  });

  it("overwrites the latest manifest when a newer version is published", async () => {
    const { store } = createFakeObjectStore();

    await publishPluginRelease(store, {
      version: "0.9.0",
      archive: Buffer.from("v1"),
      sha256: "aaa"
    });
    const second = await publishPluginRelease(store, {
      version: "0.9.1",
      archive: Buffer.from("v2"),
      sha256: "bbb"
    });

    await expect(getLatestPluginRelease(store)).resolves.toEqual(second);
  });
});

describe("getLatestPluginRelease", () => {
  it("returns null when nothing has been published yet", async () => {
    const { store } = createFakeObjectStore();

    await expect(getLatestPluginRelease(store)).resolves.toBeNull();
  });

  it("returns null instead of throwing when the manifest is corrupt", async () => {
    const { store, objects } = createFakeObjectStore();
    objects.set("wordpress-plugin/latest.json", Buffer.from("not json"));

    await expect(getLatestPluginRelease(store)).resolves.toBeNull();
  });
});

describe("getPluginDownloadUrl", () => {
  it("requests a presigned URL scoped to the manifest's object key and filename", async () => {
    const { store } = createFakeObjectStore();
    const manifest = await publishPluginRelease(store, {
      version: "0.9.0",
      archive: Buffer.from("v1"),
      sha256: "aaa"
    });

    const url = await getPluginDownloadUrl(store, manifest, 120);

    expect(url).toBe(`https://example-bucket.local/${manifest.objectKey}?expires=120`);
  });
});
