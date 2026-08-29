import { describe, expect, it } from "vitest";

import { readS3ConfigFromEnv } from "../src/s3-object-store";

describe("readS3ConfigFromEnv", () => {
  it("returns the parsed config when every S3_* var is set", () => {
    const config = readS3ConfigFromEnv({
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "sccc-local",
      S3_ACCESS_KEY_ID: "sccc",
      S3_SECRET_ACCESS_KEY: "sccc-password"
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      bucket: "sccc-local",
      accessKeyId: "sccc",
      secretAccessKey: "sccc-password"
    });
  });

  it("returns null when any S3_* var is missing", () => {
    const config = readS3ConfigFromEnv({
      S3_ENDPOINT: "http://localhost:9000",
      S3_REGION: "us-east-1",
      S3_BUCKET: "sccc-local"
    } as NodeJS.ProcessEnv);

    expect(config).toBeNull();
  });

  it("returns null when object storage is entirely unconfigured", () => {
    expect(readS3ConfigFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
