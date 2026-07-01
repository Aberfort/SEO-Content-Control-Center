import { randomUUID } from "node:crypto";

import {
  acceptInviteSchema,
  assertPermission,
  hasPermission,
  inviteMemberSchema,
  organizationCreateSchema,
  siteCreateSchema,
  updateMemberRoleSchema,
  type AcceptInviteInput,
  type InviteMemberInput,
  type Permission,
  type Role,
  type SiteCreateInput,
  type UpdateMemberRoleInput
} from "@sccc/shared";

import { buildInviteUrl, createInviteToken, hashInviteToken } from "./invite-token";
import type {
  ActivityLog,
  AppUser,
  BacklogTask,
  InviteResult,
  Organization,
  OrganizationMember,
  OrganizationMemberSummary,
  OrganizationSummary,
  Site,
  SyncedContentItem,
  SyncedContentList,
  SyncedContentListOptions
} from "./types";

type DevStoreState = {
  users: AppUser[];
  organizations: Organization[];
  members: StoreOrganizationMember[];
  sites: Site[];
  backlogTasks: BacklogTask[];
  activityLogs: ActivityLog[];
};

type StoreOrganizationMember = OrganizationMember & {
  inviteTokenHash?: string | null;
};

type CreateOrganizationInput = {
  user: AppUser;
  name: string;
};

type CreateSiteInput = {
  user: AppUser;
  organizationId: string;
  name: string;
  url: string;
};

type InviteMemberInputWithUser = {
  user: AppUser;
  organizationId: string;
  email: string;
  role: Role;
};

type UpdateMemberRoleInputWithUser = {
  user: AppUser;
  organizationId: string;
  memberId: string;
  role: Role;
};

type MemberMutationInputWithUser = {
  user: AppUser;
  organizationId: string;
  memberId: string;
};

type AcceptInviteInputWithUser = {
  user: AppUser;
  token: AcceptInviteInput["token"];
};

type AccessInput = {
  userId: string;
  organizationId: string;
  permission: Permission;
};

const globalStore = globalThis as typeof globalThis & {
  __scccDevStore?: DevStoreState;
};

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `organization-${randomUUID().slice(0, 8)}`;
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

function initialState(): DevStoreState {
  return {
    users: [],
    organizations: [],
    members: [],
    sites: [],
    backlogTasks: [],
    activityLogs: []
  };
}

export function getDevStore(): DevStoreState {
  globalStore.__scccDevStore ??= initialState();
  return globalStore.__scccDevStore;
}

export function resetDevStore(): void {
  globalStore.__scccDevStore = initialState();
}

export function ensureUser(user: AppUser): AppUser {
  const store = getDevStore();
  const existing = store.users.find((candidate) => candidate.id === user.id);

  if (existing) {
    return existing;
  }

  store.users.push(user);
  return user;
}

function ensurePlaceholderUser(email: string): AppUser {
  const store = getDevStore();
  const existing = store.users.find((candidate) => candidate.email === email);

  if (existing) {
    return existing;
  }

  const user: AppUser = {
    id: randomUUID(),
    email,
    name: email
  };

  store.users.push(user);
  return user;
}

export function listOrganizationSummariesForUser(user: AppUser): OrganizationSummary[] {
  ensureUser(user);
  const store = getDevStore();

  return store.members
    .filter((member) => member.userId === user.id && member.status === "ACTIVE")
    .map((member) => {
      const organization = store.organizations.find(
        (candidate) => candidate.id === member.organizationId
      );

      if (!organization) {
        return null;
      }

      return {
        ...organization,
        role: member.role,
        sites: listSitesForOrganization(user.id, organization.id),
        activityLogs: listActivityLogsForOrganization(user.id, organization.id)
      };
    })
    .filter((summary): summary is OrganizationSummary => summary !== null);
}

export function createOrganization(input: CreateOrganizationInput): OrganizationSummary {
  const parsed = organizationCreateSchema.parse({ name: input.name });
  const store = getDevStore();
  ensureUser(input.user);

  const baseSlug = slugify(parsed.name);
  const existingSlugs = new Set(store.organizations.map((organization) => organization.slug));
  let slug = baseSlug;
  let suffix = 2;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const organization: Organization = {
    id: randomUUID(),
    name: parsed.name,
    slug,
    createdAt: nowIso()
  };

  const member: StoreOrganizationMember = {
    id: randomUUID(),
    organizationId: organization.id,
    userId: input.user.id,
    role: "OWNER",
    status: "ACTIVE"
  };

  store.organizations.push(organization);
  store.members.push(member);
  writeActivityLog({
    organizationId: organization.id,
    userId: input.user.id,
    action: "organization.created",
    entityType: "Organization",
    entityId: organization.id,
    metadata: {
      name: organization.name,
      slug: organization.slug
    }
  });

  return {
    ...organization,
    role: member.role,
    sites: [],
    activityLogs: listActivityLogsForOrganization(input.user.id, organization.id)
  };
}

export function getMembership(userId: string, organizationId: string): OrganizationMember | null {
  const store = getDevStore();

  return (
    store.members.find(
      (member) =>
        member.userId === userId &&
        member.organizationId === organizationId &&
        member.status === "ACTIVE"
    ) ?? null
  );
}

export function requireOrganizationAccess(input: AccessInput): OrganizationMember {
  const member = getMembership(input.userId, input.organizationId);

  if (!member) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  assertPermission(member.role, input.permission);
  return member;
}

export function canAccessOrganization(
  userId: string,
  organizationId: string,
  permission: Permission
): boolean {
  const member = getMembership(userId, organizationId);
  return member ? hasPermission(member.role, permission) : false;
}

export function getOrganizationSummary(
  userId: string,
  organizationId: string
): OrganizationSummary | null {
  const member = requireOrganizationAccess({
    userId,
    organizationId,
    permission: "organization:read"
  });
  const store = getDevStore();
  const organization = store.organizations.find((candidate) => candidate.id === organizationId);

  if (!organization) {
    return null;
  }

  return {
    ...organization,
    role: member.role,
    sites: listSitesForOrganization(userId, organizationId),
    activityLogs: listActivityLogsForOrganization(userId, organizationId)
  };
}

export function createSite(input: CreateSiteInput): Site {
  const parsed: SiteCreateInput = siteCreateSchema.parse(input);
  const store = getDevStore();

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "site:create"
  });

  const normalizedUrl = normalizeUrl(parsed.url);
  const duplicate = store.sites.find(
    (site) => site.organizationId === parsed.organizationId && site.url === normalizedUrl
  );

  if (duplicate) {
    throw new Error("SITE_ALREADY_EXISTS");
  }

  const site: Site = {
    id: randomUUID(),
    organizationId: parsed.organizationId,
    name: parsed.name,
    url: normalizedUrl,
    status: "PENDING_CONNECTION",
    createdAt: nowIso()
  };

  store.sites.push(site);
  writeActivityLog({
    organizationId: site.organizationId,
    userId: input.user.id,
    action: "site.created",
    entityType: "Site",
    entityId: site.id,
    metadata: {
      name: site.name,
      url: site.url
    }
  });

  return site;
}

export function listSitesForOrganization(userId: string, organizationId: string): Site[] {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "site:read"
  });

  return getDevStore().sites.filter((site) => site.organizationId === organizationId);
}

export function listActivityLogsForOrganization(
  userId: string,
  organizationId: string
): ActivityLog[] {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "organization:read"
  });

  return getDevStore()
    .activityLogs.filter((log) => log.organizationId === organizationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function listSyncedContentForSite(
  userId: string,
  organizationId: string,
  siteId: string,
  options?: SyncedContentListOptions
): SyncedContentList {
  void siteId;
  void options;

  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "site:read"
  });

  return {
    items: [],
    nextCursor: null,
    total: 0
  };
}

export function getSyncedContentItem(
  userId: string,
  organizationId: string,
  siteId: string,
  contentItemId: string
): SyncedContentItem | null {
  void siteId;
  void contentItemId;

  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "site:read"
  });

  return null;
}

export function createBacklogTaskFromCandidate(input: {
  user: AppUser;
  organizationId: string;
  siteId: string;
  contentItemId: string;
  candidateId: string;
}): BacklogTask {
  void input.siteId;
  void input.contentItemId;
  void input.candidateId;

  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "backlog:update"
  });

  throw new Error("CONTENT_ITEM_NOT_FOUND");
}

export function listMembersForOrganization(
  userId: string,
  organizationId: string
): OrganizationMemberSummary[] {
  requireOrganizationAccess({
    userId,
    organizationId,
    permission: "organization:read"
  });

  const store = getDevStore();

  return store.members
    .filter((member) => member.organizationId === organizationId)
    .map((member) => {
      const user = store.users.find((candidate) => candidate.id === member.userId);

      return mapMemberSummary(member, user);
    });
}

export function inviteMember(input: InviteMemberInputWithUser): InviteResult {
  const parsed: InviteMemberInput = inviteMemberSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "members:invite"
  });

  const invitedUser = ensurePlaceholderUser(parsed.email);
  const existing = store.members.find(
    (member) => member.organizationId === parsed.organizationId && member.userId === invitedUser.id
  );

  if (existing) {
    throw new Error("MEMBER_ALREADY_EXISTS");
  }

  const invite = createInviteToken();
  const member: StoreOrganizationMember = {
    id: randomUUID(),
    organizationId: parsed.organizationId,
    userId: invitedUser.id,
    role: parsed.role,
    status: "INVITED",
    invitedEmail: parsed.email,
    inviteExpiresAt: invite.expiresAt.toISOString()
  };

  member.inviteTokenHash = invite.tokenHash;
  store.members.push(member);
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "member.invited",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: parsed.email,
      role: parsed.role
    }
  });

  return {
    member: mapMemberSummary(member, invitedUser),
    inviteUrl: buildInviteUrl(invite.token),
    expiresAt: invite.expiresAt.toISOString()
  };
}

export function resendInvite(input: MemberMutationInputWithUser): InviteResult {
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "members:invite"
  });

  const member = store.members.find(
    (candidate) =>
      candidate.id === input.memberId && candidate.organizationId === input.organizationId
  );

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (member.status !== "INVITED") {
    throw new Error("INVITE_NOT_PENDING");
  }

  const invite = createInviteToken();
  member.inviteTokenHash = invite.tokenHash;
  member.inviteExpiresAt = invite.expiresAt.toISOString();
  member.inviteAcceptedAt = null;
  member.inviteCanceledAt = null;

  const invitedUser = store.users.find((candidate) => candidate.id === member.userId);
  writeActivityLog({
    organizationId: input.organizationId,
    userId: input.user.id,
    action: "member.invite_resent",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: member.invitedEmail ?? invitedUser?.email ?? "unknown@example.com",
      role: member.role
    }
  });

  return {
    member: mapMemberSummary(member, invitedUser),
    inviteUrl: buildInviteUrl(invite.token),
    expiresAt: invite.expiresAt.toISOString()
  };
}

export function cancelInvite(input: MemberMutationInputWithUser): OrganizationMemberSummary {
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: input.organizationId,
    permission: "members:manage"
  });

  const member = store.members.find(
    (candidate) =>
      candidate.id === input.memberId && candidate.organizationId === input.organizationId
  );

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (member.status !== "INVITED") {
    throw new Error("INVITE_NOT_PENDING");
  }

  member.status = "CANCELED";
  member.inviteTokenHash = null;
  member.inviteExpiresAt = null;
  member.inviteCanceledAt = nowIso();

  const invitedUser = store.users.find((candidate) => candidate.id === member.userId);
  writeActivityLog({
    organizationId: input.organizationId,
    userId: input.user.id,
    action: "member.invite_canceled",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: member.invitedEmail ?? invitedUser?.email ?? "unknown@example.com",
      role: member.role
    }
  });

  return mapMemberSummary(member, invitedUser);
}

export function acceptInvite(input: AcceptInviteInputWithUser): OrganizationMemberSummary {
  const parsed = acceptInviteSchema.parse({ token: input.token });
  const store = getDevStore();
  const tokenHash = hashInviteToken(parsed.token);
  const member = store.members.find((candidate) => candidate.inviteTokenHash === tokenHash);

  if (!member) {
    throw new Error("INVITE_NOT_FOUND");
  }

  if (member.status !== "INVITED") {
    throw new Error("INVITE_NOT_PENDING");
  }

  if (!member.inviteExpiresAt || new Date(member.inviteExpiresAt) <= new Date()) {
    throw new Error("INVITE_EXPIRED");
  }

  let invitedUser = store.users.find((candidate) => candidate.id === member.userId);

  if (invitedUser?.email !== input.user.email) {
    throw new Error("INVITE_EMAIL_MISMATCH");
  }

  if (member.userId !== input.user.id) {
    member.userId = input.user.id;
    invitedUser = ensureUser(input.user);
  }

  member.status = "ACTIVE";
  member.inviteTokenHash = null;
  member.inviteExpiresAt = null;
  member.inviteAcceptedAt = nowIso();
  ensureUser(input.user);

  writeActivityLog({
    organizationId: member.organizationId,
    userId: input.user.id,
    action: "member.accepted_invite",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      email: input.user.email,
      role: member.role
    }
  });

  return mapMemberSummary(member, invitedUser);
}

export function updateMemberRole(input: UpdateMemberRoleInputWithUser): OrganizationMemberSummary {
  const parsed: UpdateMemberRoleInput = updateMemberRoleSchema.parse(input);
  const store = getDevStore();
  requireOrganizationAccess({
    userId: input.user.id,
    organizationId: parsed.organizationId,
    permission: "members:manage"
  });

  const member = store.members.find(
    (candidate) =>
      candidate.id === parsed.memberId && candidate.organizationId === parsed.organizationId
  );

  if (!member) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (member.userId === input.user.id) {
    throw new Error("CANNOT_CHANGE_OWN_ROLE");
  }

  if (member.role === "OWNER") {
    throw new Error("OWNER_ROLE_IS_PROTECTED");
  }

  member.role = parsed.role;
  writeActivityLog({
    organizationId: parsed.organizationId,
    userId: input.user.id,
    action: "member.role_updated",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      role: parsed.role
    }
  });

  const user = store.users.find((candidate) => candidate.id === member.userId);

  return mapMemberSummary(member, user);
}

export function addMemberForTest(input: {
  organizationId: string;
  userId: string;
  role: Role;
}): OrganizationMember {
  const member: OrganizationMember = {
    id: randomUUID(),
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role,
    status: "ACTIVE"
  };

  getDevStore().members.push(member);
  return member;
}

function writeActivityLog(input: Omit<ActivityLog, "id" | "createdAt">): ActivityLog {
  const activityLog: ActivityLog = {
    ...input,
    id: randomUUID(),
    createdAt: nowIso()
  };

  getDevStore().activityLogs.push(activityLog);
  return activityLog;
}

function mapMemberSummary(
  member: StoreOrganizationMember,
  user: AppUser | undefined
): OrganizationMemberSummary {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    email: user?.email ?? member.invitedEmail ?? "unknown@example.com",
    name: user?.name ?? null,
    invitedEmail: member.invitedEmail ?? null,
    inviteExpiresAt: member.inviteExpiresAt ?? null,
    inviteAcceptedAt: member.inviteAcceptedAt ?? null,
    inviteCanceledAt: member.inviteCanceledAt ?? null,
    createdAt: nowIso()
  };
}
