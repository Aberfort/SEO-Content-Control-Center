export { crawlUrl, type CrawlOptions, type CrawlResult } from "./crawler";
export { extractSignals, type ExtractedSignals } from "./extract";
export { diffSnapshots } from "./diff";
export type { SnapshotFields, DetectedEvent, EventSeverity } from "./types";
export {
  computePageTrafficSignal,
  computeTrafficSignal,
  type DailyMetricPoint,
  type PageInsightRow,
  type TrafficSignal,
  type TrafficSignalOptions,
  type TrafficSignalSeverity
} from "./traffic-signal";
export { normalizeUrl } from "./url-matching";
export {
  detectRegressions,
  type RegressionCandidate,
  type RegressionEngineEvent,
  type RegressionEngineInput
} from "./regression-engine";
export {
  UnsafeUrlError,
  assertAllowedUrlShape,
  assertPublicUrl,
  isPrivateOrReservedAddress,
  resolvePublicHostname
} from "./ssrf-guard";
