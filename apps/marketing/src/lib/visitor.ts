/**
 * Deliberately dependency-free (no `@sccc/shared` import): this file is used
 * from Edge Middleware, which cannot bundle `plugin-signing.ts`'s `node:crypto`
 * import that the shared package's barrel export pulls in transitively.
 */

/** Name of the anonymous, first-party visitor cookie set by middleware. */
export const visitorIdCookieName = "sccc_vid";

/**
 * Fallback distinct id when the visitor cookie is missing (e.g. an API route
 * hit directly without ever loading a page through middleware first).
 */
export function anonymousDistinctId(): string {
  return `anon-${crypto.randomUUID()}`;
}
