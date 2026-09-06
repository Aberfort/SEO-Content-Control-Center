/**
 * Platform-owner access, separate from every organization-scoped Role.
 * There is no superadmin table -- this is deliberately a small, env-only
 * allowlist so granting plan-comp codes can't be reached by any
 * organization's own OWNER/ADMIN role, only by whoever the deployer lists.
 * Comma-separated, case-insensitive: SCCC_PLATFORM_ADMIN_EMAILS=you@example.com
 */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowlist = platformAdminEmails();
  return allowlist.has(email.trim().toLowerCase());
}

function platformAdminEmails(): Set<string> {
  const raw = process.env.SCCC_PLATFORM_ADMIN_EMAILS ?? "";

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
}
