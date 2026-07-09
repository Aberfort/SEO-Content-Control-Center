import { createHash, createHmac } from "node:crypto";

export function signPluginRequest(input: {
  method: string;
  path: string;
  timestamp: number;
  body: string;
  secret: string;
}): string {
  const payload = [
    input.method.toUpperCase(),
    input.path,
    String(input.timestamp),
    createHash("sha256").update(input.body).digest("hex")
  ].join("\n");

  return createHmac("sha256", input.secret).update(payload).digest("hex");
}
