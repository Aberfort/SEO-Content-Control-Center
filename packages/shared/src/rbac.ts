export const roles = [
  "OWNER",
  "ADMIN",
  "SEO_MANAGER",
  "EDITOR",
  "WRITER",
  "VIEWER",
  "BILLING_MANAGER"
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "organization:read",
  "organization:update",
  "members:invite",
  "members:manage",
  "billing:read",
  "billing:manage",
  "site:create",
  "site:read",
  "site:update",
  "site:delete",
  "audit:read",
  "audit:run",
  "backlog:read",
  "backlog:update",
  "content_operation:preview",
  "content_operation:confirm",
  "integration:manage"
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<Role, readonly Permission[]> = {
  OWNER: permissions,
  ADMIN: permissions.filter((permission) => permission !== "billing:manage"),
  SEO_MANAGER: [
    "organization:read",
    "site:read",
    "site:update",
    "audit:read",
    "audit:run",
    "backlog:read",
    "backlog:update",
    "content_operation:preview",
    "content_operation:confirm",
    "integration:manage"
  ],
  EDITOR: [
    "organization:read",
    "site:read",
    "audit:read",
    "backlog:read",
    "backlog:update",
    "content_operation:preview"
  ],
  WRITER: ["organization:read", "site:read", "audit:read", "backlog:read", "backlog:update"],
  VIEWER: ["organization:read", "site:read", "audit:read", "backlog:read"],
  BILLING_MANAGER: ["organization:read", "billing:read", "billing:manage"]
} satisfies Record<Role, readonly Permission[]>;

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role ${role} cannot perform ${permission}`);
  }
}
