export type ObjectStore = {
  putObject(input: { key: string; body: Buffer; contentType?: string }): Promise<void>;
  getObjectText(key: string): Promise<string | null>;
  getPresignedDownloadUrl(input: {
    key: string;
    expiresInSeconds: number;
    filename?: string;
  }): Promise<string>;
};
