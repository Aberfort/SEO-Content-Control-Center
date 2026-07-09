type BulkOperationNotificationEvent = "completed" | "failed" | "rolled_back" | "retry_started";

type BulkOperationNotificationInput = {
  event: BulkOperationNotificationEvent;
  itemCount: number;
  failedItemCount?: number;
  retryItemCount?: number;
  message?: string | null;
  reason?: string | null;
};

type BulkOperationNotification = {
  type: string;
  title: string;
  body: string;
};

export function buildBulkOperationNotification(
  input: BulkOperationNotificationInput
): BulkOperationNotification {
  switch (input.event) {
    case "completed":
      return {
        type: "bulk_operation.completed",
        title: "Safe operation completed",
        body: `Safe content operation completed for ${input.itemCount} item${pluralize(input.itemCount)}.`
      };
    case "failed":
      return {
        type: "bulk_operation.failed",
        title: "Safe operation failed",
        body: `Safe content operation failed for ${input.failedItemCount ?? 0} of ${input.itemCount} item${pluralize(input.itemCount)}.${formatOptionalDetail(input.message)}`
      };
    case "rolled_back":
      return {
        type: "bulk_operation.rolled_back",
        title: "Safe operation rolled back",
        body: `Safe content operation rollback was recorded for ${input.itemCount} item${pluralize(input.itemCount)}.${formatOptionalDetail(input.reason)}`
      };
    case "retry_started":
      return {
        type: "bulk_operation.retry_started",
        title: "Safe operation retry started",
        body: `Retry was started for ${input.retryItemCount ?? 0} failed item${pluralize(input.retryItemCount ?? 0)}.${formatOptionalDetail(input.reason)}`
      };
  }
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}

function formatOptionalDetail(value: string | null | undefined): string {
  return value ? ` ${value}` : "";
}
