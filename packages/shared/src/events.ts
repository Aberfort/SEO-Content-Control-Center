export const analyticsEvents = [
  "landing_view",
  "pricing_view",
  "demo_requested",
  "trial_started",
  "signup_completed",
  "organization_created",
  "site_added",
  "plugin_connected",
  "first_sync_completed",
  "GSC_connected",
  "first_audit_completed",
  "backlog_viewed",
  "first_task_completed",
  "bulk_operation_started",
  "bulk_operation_completed",
  "AI_feature_used",
  "plan_upgraded",
  "payment_completed",
  "subscription_cancelled",
  "cancellation_reason_selected",
  "support_ticket_created",
  "integration_error",
  "sync_error"
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];
