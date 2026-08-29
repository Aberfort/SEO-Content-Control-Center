/**
 * Normalizes a URL for loose matching between a monitored URL and a Search
 * Console-reported page. Ignores protocol, a leading `www.` host prefix,
 * trailing slashes, query strings, and fragments, because Search Console and
 * a user-entered monitored URL commonly disagree on those while still
 * describing the same document.
 *
 * Deliberately duplicated (not imported) from apps/saas/src/lib/gsc-content-matching.ts's
 * normalizeContentUrl — that module lives in the SaaS app and this package
 * is shared with the worker, which cannot import across the app boundary.
 * Keep the two in sync if the matching rules ever change.
 */
export function normalizeUrl(url: string): string | null {
  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

  return `${host}${pathname}`;
}
