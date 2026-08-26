export { crawlUrl, type CrawlOptions, type CrawlResult } from "./crawler";
export { extractSignals, type ExtractedSignals } from "./extract";
export { diffSnapshots } from "./diff";
export type { SnapshotFields, DetectedEvent, EventSeverity } from "./types";
export {
  UnsafeUrlError,
  assertAllowedUrlShape,
  assertPublicUrl,
  isPrivateOrReservedAddress,
  resolvePublicHostname
} from "./ssrf-guard";
