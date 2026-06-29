import { tenantScopeSchema, type TenantScope } from "@sccc/shared";

export function parseTenantScope(input: unknown): TenantScope {
  return tenantScopeSchema.parse(input);
}

export function tenantCacheKey(scope: TenantScope, key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return scope.siteId
    ? `org:${scope.organizationId}:site:${scope.siteId}:${safeKey}`
    : `org:${scope.organizationId}:${safeKey}`;
}

export function tenantStoragePrefix(scope: Required<TenantScope>): string {
  return `organizations/${scope.organizationId}/sites/${scope.siteId}`;
}
