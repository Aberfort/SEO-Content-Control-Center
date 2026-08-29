export type SnapshotFields = {
  httpStatus: number | null;
  finalUrl: string | null;
  responseTimeMs: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  metaRobots: string | null;
  xRobotsTag: string | null;
  hasStructuredData: boolean | null;
  hasGa4: boolean | null;
  hasGtm: boolean | null;
  contentHash: string | null;
  htmlHash: string | null;
};

export type EventSeverity = "INFO" | "WARNING" | "CRITICAL";

export type DetectedEvent = {
  type: string;
  severity: EventSeverity;
  title: string;
  oldValue: unknown;
  newValue: unknown;
  metadata?: Record<string, unknown>;
};
