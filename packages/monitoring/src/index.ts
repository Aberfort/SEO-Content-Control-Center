export { crawlUrl, type CrawlOptions, type CrawlResult } from "./crawler";
export { extractSignals, type ExtractedSignals } from "./extract";
export { diffSnapshots } from "./diff";
export type { SnapshotFields, DetectedEvent, EventSeverity } from "./types";
export {
  computeTrafficSignal,
  type DailyMetricPoint,
  type TrafficSignal,
  type TrafficSignalOptions,
  type TrafficSignalSeverity
} from "./traffic-signal";
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
