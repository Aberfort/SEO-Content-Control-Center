import { assertRateLimit, rateLimitKeyFromHeaders } from "./rate-limit";

type BulkOperationRateLimitInput = {
  request: Request;
  userId: string;
  organizationId: string;
  siteId: string;
  action: string;
  operationId?: string;
};

export function assertBulkOperationRateLimit(input: BulkOperationRateLimitInput): void {
  assertRateLimit(
    "bulk-operation",
    rateLimitKeyFromHeaders(
      input.request.headers,
      buildBulkOperationRateLimitKey({
        userId: input.userId,
        organizationId: input.organizationId,
        siteId: input.siteId,
        action: input.action,
        operationId: input.operationId
      })
    )
  );
}

export function buildBulkOperationRateLimitKey(input: {
  userId: string;
  organizationId: string;
  siteId: string;
  action: string;
  operationId?: string;
}): string {
  return [
    input.userId,
    input.organizationId,
    input.siteId,
    input.action,
    input.operationId ?? "site"
  ].join(":");
}
