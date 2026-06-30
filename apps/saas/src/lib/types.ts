import type { Role } from "@sccc/shared";

export type AppUser = {
  id: string;
  email: string;
  name: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
};

export type Site = {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  status: "PENDING_CONNECTION" | "CONNECTED" | "SYNCING" | "ERROR" | "DISCONNECTED";
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type OrganizationSummary = Organization & {
  role: Role;
  sites: Site[];
  activityLogs: ActivityLog[];
};
