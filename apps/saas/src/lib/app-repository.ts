import type { Prisma } from "@prisma/client";
import { prisma } from "@sccc/database";
import {
  acceptInviteSchema,
  assertPermission,
  backlogTaskListQuerySchema,
  backlogTaskFromCandidateSchema,
  hasPermission,
  inviteMemberSchema,
  organizationCreateSchema,
  siteCreateSchema,
  updateBacklogTaskStatusSchema,
  updateMemberRoleSchema,
  type AcceptInviteInput,
  type BacklogTaskListQuery,
  type BacklogTaskFromCandidateInput,
  type InviteMemberInput,
  type Permission,
  type SiteCreateInput,
  type UpdateBacklogTaskStatusInput,
  type UpdateMemberRoleInput
} from "@sccc/shared";

import {
  acceptInvite as acceptDevInvite,
  cancelInvite as cancelDevInvite,
  createBacklogTaskFromCandidate as createDevBacklogTaskFromCandidate,
  createOrganization as createDevOrganization,
  createSite as createDevSite,
  getSyncedContentItem as getDevSyncedContentItem,
  getOrganizationSummary as getDevOrganizationSummary,
  inviteMember as inviteDevMember,
  listActivityLogsForOrganization as listDevActivityLogsForOrganization,
  listBacklogTasksForSite as listDevBacklogTasksForSite,
  listMembersForOrganization as listDevMembersForOrganization,
  listOrganizationSummariesForUser as listDevOrganizationSummariesForUser,
  listSitesForOrganization as listDevSitesForOrganization,
  listSyncedContentForSite as listDevSyncedContentForSite,
  resendInvite as resendDevInvite,
  updateBacklogTaskStatus as updateDevBacklogTaskStatus,
  updateMemberRole as updateDevMemberRole
} from "./dev-store";
import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "./content-health";
import { buildInviteUrl, createInviteToken, hashInviteToken } from "./invite-token";
import type {
  ActivityLog,
  AppUser,
  BacklogTask,
  BacklogTaskList,
  BacklogTaskListOptions,
  BacklogTaskSummary,
  InviteResult,
  OrganizationMemberSummary,
  OrganizationSummary,
  Site,
  SyncedContentList,
  SyncedContentListOptions,
  SyncedContentItem
} from "./types";

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

type CreateBacklogTaskFromCandidateInput = BacklogTaskFromCandidateInput & {
  user: AppUser;
};

type UpdateBacklogTaskStatusInputWithUser = UpdateBacklogTaskStatusInput & {
  user: AppUser;
};

type InviteMemberInputWithUser = {
  user: AppUser;
  organizationId: string;
  email: string;
  role: InviteMemberInput["role"];
};

type UpdateMemberRoleInputWithUser = {
  user: AppUser;
  organizationId: string;
  memberId: string;
  role: UpdateMemberRoleInput["role"];
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

type AppRepository = {
  listOrganizationSummariesForUser(user: AppUser): Promise<OrganizationSummary[]>;
  createOrganization(input: CreateOrganizationInput): Promise<OrganizationSummary>;
  getOrganizationSummary(
    userId: string,
    organizationId: string
  ): Promise<OrganizationSummary | null>;
  createSite(input: CreateSiteInput): Promise<Site>;
  listSitesForOrganization(userId: string, organizationId: string): Promise<Site[]>;
  listActivityLogsForOrganization(userId: string, organizationId: string): Promise<ActivityLog[]>;
  listSyncedContentForSite(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: SyncedContentListOptions
  ): Promise<SyncedContentList>;
  getSyncedContentItem(
    userId: string,
    organizationId: string,
    siteId: string,
    contentItemId: string
  ): Promise<SyncedContentItem | null>;
  createBacklogTaskFromCandidate(input: CreateBacklogTaskFromCandidateInput): Promise<BacklogTask>;
  listBacklogTasksForSite(
    userId: string,
    organizationId: string,
    siteId: string,
    options?: BacklogTaskListOptions
  ): Promise<BacklogTaskList>;
  updateBacklogTaskStatus(input: UpdateBacklogTaskStatusInputWithUser): Promise<BacklogTask>;
  listMembersForOrganization(
    userId: string,
    organizationId: string
  ): Promise<OrganizationMemberSummary[]>;
  inviteMember(input: InviteMemberInputWithUser): Promise<InviteResult>;
  resendInvite(input: MemberMutationInputWithUser): Promise<InviteResult>;
  cancelInvite(input: MemberMutationInputWithUser): Promise<OrganizationMemberSummary>;
  acceptInvite(input: AcceptInviteInputWithUser): Promise<OrganizationMemberSummary>;
  updateMemberRole(input: UpdateMemberRoleInputWithUser): Promise<OrganizationMemberSummary>;
};

export function getAppRepository(): AppRepository {
  return process.env.SCCC_DATA_STORE === "prisma" && process.env.DATABASE_URL
    ? prismaRepository
    : devStoreRepository;
}

const devStoreRepository: AppRepository = {
  async listOrganizationSummariesForUser(user) {
    return listDevOrganizationSummariesForUser(user);
  },
  async createOrganization(input) {
    return createDevOrganization(input);
  },
  async getOrganizationSummary(userId, organizationId) {
    return getDevOrganizationSummary(userId, organizationId);
  },
  async createSite(input) {
    return createDevSite(input);
  },
  async listSitesForOrganization(userId, organizationId) {
    return listDevSitesForOrganization(userId, organizationId);
  },
  async listActivityLogsForOrganization(userId, organizationId) {
    return listDevActivityLogsForOrganization(userId, organizationId);
  },
  async listSyncedContentForSite(userId, organizationId, siteId, options) {
    return listDevSyncedContentForSite(userId, organizationId, siteId, options);
  },
  async getSyncedContentItem(userId, organizationId, siteId, contentItemId) {
    return getDevSyncedContentItem(userId, organizationId, siteId, contentItemId);
  },
  async createBacklogTaskFromCandidate(input) {
    return createDevBacklogTaskFromCandidate(input);
  },
  async listBacklogTasksForSite(userId, organizationId, siteId, options) {
    return listDevBacklogTasksForSite(userId, organizationId, siteId, options);
  },
  async updateBacklogTaskStatus(input) {
    return updateDevBacklogTaskStatus(input);
  },
  async listMembersForOrganization(userId, organizationId) {
    return listDevMembersForOrganization(userId, organizationId);
  },
  async inviteMember(input) {
    return inviteDevMember(input);
  },
  async resendInvite(input) {
    return resendDevInvite(input);
  },
  async cancelInvite(input) {
    return cancelDevInvite(input);
  },
  async acceptInvite(input) {
    return acceptDevInvite(input);
  },
  async updateMemberRole(input) {
    return updateDevMemberRole(input);
  }
};

const prismaRepository: AppRepository = {
  async listOrganizationSummariesForUser(user) {
    await ensureDbUser(user);

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.id,
        status: "ACTIVE"
      },
      include: {
        organization: {
          include: {
            sites: {
              orderBy: {
                createdAt: "desc"
              }
            },
            activityLogs: {
              orderBy: {
                createdAt: "desc"
              },
              take: 10
            }
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      createdAt: membership.organization.createdAt.toISOString(),
      role: membership.role,
      sites: membership.organization.sites.map(mapSite),
      activityLogs: membership.organization.activityLogs.map(mapActivityLog)
    }));
  },

  async createOrganization(input) {
    const parsed = organizationCreateSchema.parse({ name: input.name });
    await ensureDbUser(input.user);

    const organization = await prisma.$transaction(async (tx) => {
      const baseSlug = slugify(parsed.name);
      const slug = await uniqueSlug(baseSlug);

      const created = await tx.organization.create({
        data: {
          name: parsed.name,
          slug,
          members: {
            create: {
              userId: input.user.id,
              role: "OWNER",
              status: "ACTIVE"
            }
          }
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: created.id,
          userId: input.user.id,
          action: "organization.created",
          entityType: "Organization",
          entityId: created.id,
          metadata: {
            name: created.name,
            slug: created.slug
          }
        }
      });

      return created;
    });

    const summary = await this.getOrganizationSummary(input.user.id, organization.id);

    if (!summary) {
      throw new Error("ORGANIZATION_NOT_FOUND");
    }

    return summary;
  },

  async getOrganizationSummary(userId, organizationId) {
    const membership = await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "organization:read"
    });

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationId
      },
      include: {
        sites: {
          orderBy: {
            createdAt: "desc"
          }
        },
        activityLogs: {
          orderBy: {
            createdAt: "desc"
          },
          take: 10
        }
      }
    });

    if (!organization) {
      return null;
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt.toISOString(),
      role: membership.role,
      sites: organization.sites.map(mapSite),
      activityLogs: organization.activityLogs.map(mapActivityLog)
    };
  },

  async createSite(input) {
    const parsed: SiteCreateInput = siteCreateSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "site:create"
    });

    const normalizedUrl = normalizeUrl(parsed.url);

    try {
      const site = await prisma.$transaction(async (tx) => {
        const created = await tx.site.create({
          data: {
            organizationId: parsed.organizationId,
            name: parsed.name,
            url: normalizedUrl,
            status: "PENDING_CONNECTION"
          }
        });

        await tx.activityLog.create({
          data: {
            organizationId: parsed.organizationId,
            userId: input.user.id,
            action: "site.created",
            entityType: "Site",
            entityId: created.id,
            metadata: {
              name: created.name,
              url: created.url
            }
          }
        });

        return created;
      });

      return mapSite(site);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("SITE_ALREADY_EXISTS");
      }

      throw error;
    }
  },

  async listSitesForOrganization(userId, organizationId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "site:read"
    });

    const sites = await prisma.site.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return sites.map(mapSite);
  },

  async listActivityLogsForOrganization(userId, organizationId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "organization:read"
    });

    const logs = await prisma.activityLog.findMany({
      where: {
        organizationId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 25
    });

    return logs.map(mapActivityLog);
  },

  async listSyncedContentForSite(userId, organizationId, siteId, options) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "site:read"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const normalizedOptions = normalizeSyncedContentListOptions(options);
    const where: Prisma.SyncedContentItemWhereInput = {
      organizationId,
      siteId
    };

    if (normalizedOptions.type) {
      where.type = normalizedOptions.type;
    }

    if (normalizedOptions.status) {
      where.status = normalizedOptions.status;
    }

    if (normalizedOptions.query) {
      where.OR = [
        {
          title: {
            contains: normalizedOptions.query,
            mode: "insensitive"
          }
        },
        {
          url: {
            contains: normalizedOptions.query,
            mode: "insensitive"
          }
        },
        {
          externalId: {
            contains: normalizedOptions.query,
            mode: "insensitive"
          }
        }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.syncedContentItem.findMany({
        where,
        orderBy: [
          {
            modifiedAt: "desc"
          },
          {
            id: "desc"
          }
        ],
        ...(normalizedOptions.cursor
          ? {
              cursor: {
                id: normalizedOptions.cursor
              },
              skip: 1
            }
          : {}),
        take: normalizedOptions.limit + 1
      }),
      prisma.syncedContentItem.count({
        where
      })
    ]);

    const visibleItems = items.slice(0, normalizedOptions.limit);

    return {
      items: visibleItems.map(mapSyncedContentItem),
      nextCursor:
        items.length > normalizedOptions.limit
          ? (visibleItems[visibleItems.length - 1]?.id ?? null)
          : null,
      total
    };
  },

  async getSyncedContentItem(userId, organizationId, siteId, contentItemId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "site:read"
    });

    const item = await prisma.syncedContentItem.findFirst({
      where: {
        id: contentItemId,
        organizationId,
        siteId,
        site: {
          organizationId
        }
      }
    });

    return item ? mapSyncedContentItem(item) : null;
  },

  async createBacklogTaskFromCandidate(input) {
    const parsed = backlogTaskFromCandidateSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const item = await prisma.syncedContentItem.findFirst({
      where: {
        id: parsed.contentItemId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId,
        site: {
          organizationId: parsed.organizationId
        }
      }
    });

    if (!item) {
      throw new Error("CONTENT_ITEM_NOT_FOUND");
    }

    const syncedItem = mapSyncedContentItem(item);
    const healthSignals = buildSyncedContentHealthSignals(syncedItem);
    const candidate = buildSyncedContentBacklogCandidates(syncedItem, healthSignals).find(
      (backlogCandidate) => backlogCandidate.id === parsed.candidateId
    );

    if (!candidate) {
      throw new Error("BACKLOG_CANDIDATE_NOT_FOUND");
    }

    const issueType = `synced_content.${candidate.sourceSignalId}`;
    const task = await prisma.$transaction(async (tx) => {
      const existing = await tx.backlogTask.findFirst({
        where: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          url: syncedItem.url,
          issueType
        }
      });

      if (existing) {
        return existing;
      }

      const created = await tx.backlogTask.create({
        data: {
          organizationId: parsed.organizationId,
          siteId: parsed.siteId,
          title: candidate.title,
          url: syncedItem.url,
          issueType,
          severity: mapCandidatePriorityToSeverity(candidate.priority),
          potentialImpact: candidate.rationale,
          effortEstimate: mapCandidatePriorityToEffort(candidate.priority),
          tags: ["synced-content", candidate.sourceSignalId]
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "backlog_task.created_from_candidate",
          entityType: "BacklogTask",
          entityId: created.id,
          metadata: {
            siteId: parsed.siteId,
            contentItemId: parsed.contentItemId,
            candidateId: parsed.candidateId,
            sourceSignalId: candidate.sourceSignalId
          }
        }
      });

      return created;
    });

    return mapBacklogTask(task);
  },

  async listBacklogTasksForSite(userId, organizationId, siteId, options) {
    const normalizedOptions = normalizeBacklogTaskListOptions(options);
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "backlog:read"
    });

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        organizationId
      }
    });

    if (!site) {
      throw new Error("SITE_NOT_FOUND");
    }

    const baseWhere: Prisma.BacklogTaskWhereInput = {
      organizationId,
      siteId
    };
    const filteredWhere: Prisma.BacklogTaskWhereInput = {
      ...baseWhere,
      ...(normalizedOptions.status ? { status: normalizedOptions.status } : {}),
      ...(normalizedOptions.severity ? { severity: normalizedOptions.severity } : {})
    };

    const [tasks, total, statusGroups, severityGroups] = await prisma.$transaction([
      prisma.backlogTask.findMany({
        where: filteredWhere,
        orderBy: [
          {
            updatedAt: "desc"
          },
          {
            id: "desc"
          }
        ],
        take: 50
      }),
      prisma.backlogTask.count({
        where: baseWhere
      }),
      prisma.backlogTask.groupBy({
        by: ["status"],
        where: baseWhere,
        orderBy: {
          status: "asc"
        },
        _count: {
          _all: true
        }
      }),
      prisma.backlogTask.groupBy({
        by: ["severity"],
        where: baseWhere,
        orderBy: {
          severity: "asc"
        },
        _count: {
          _all: true
        }
      })
    ]);

    return {
      items: tasks.map(mapBacklogTask),
      summary: buildBacklogSummary(total, statusGroups, severityGroups)
    };
  },

  async updateBacklogTaskStatus(input) {
    const parsed = updateBacklogTaskStatusSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "backlog:update"
    });

    const existing = await prisma.backlogTask.findFirst({
      where: {
        id: parsed.taskId,
        organizationId: parsed.organizationId,
        siteId: parsed.siteId
      }
    });

    if (!existing) {
      throw new Error("BACKLOG_TASK_NOT_FOUND");
    }

    if (existing.status === parsed.status) {
      return mapBacklogTask(existing);
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.backlogTask.update({
        where: {
          id: existing.id
        },
        data: {
          status: parsed.status
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "backlog_task.status_updated",
          entityType: "BacklogTask",
          entityId: updated.id,
          metadata: {
            siteId: parsed.siteId,
            previousStatus: existing.status,
            status: parsed.status
          }
        }
      });

      return updated;
    });

    return mapBacklogTask(task);
  },

  async listMembersForOrganization(userId, organizationId) {
    await requireDbOrganizationAccess({
      userId,
      organizationId,
      permission: "organization:read"
    });

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return members.map(mapMember);
  },

  async inviteMember(input) {
    const parsed: InviteMemberInput = inviteMemberSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "members:invite"
    });

    const invite = createInviteToken();

    try {
      const member = await prisma.$transaction(async (tx) => {
        const invitedUser = await tx.user.upsert({
          where: {
            email: parsed.email
          },
          update: {},
          create: {
            email: parsed.email,
            name: parsed.email
          }
        });

        const created = await tx.organizationMember.create({
          data: {
            organizationId: parsed.organizationId,
            userId: invitedUser.id,
            role: parsed.role,
            status: "INVITED",
            invitedEmail: parsed.email,
            inviteTokenHash: invite.tokenHash,
            inviteExpiresAt: invite.expiresAt
          },
          include: {
            user: true
          }
        });

        await tx.activityLog.create({
          data: {
            organizationId: parsed.organizationId,
            userId: input.user.id,
            action: "member.invited",
            entityType: "OrganizationMember",
            entityId: created.id,
            metadata: {
              email: parsed.email,
              role: parsed.role
            }
          }
        });

        return created;
      });

      return {
        member: mapMember(member),
        inviteUrl: buildInviteUrl(invite.token),
        expiresAt: invite.expiresAt.toISOString()
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("MEMBER_ALREADY_EXISTS");
      }

      throw error;
    }
  },

  async resendInvite(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "members:invite"
    });

    const existing = await prisma.organizationMember.findFirst({
      where: {
        id: input.memberId,
        organizationId: input.organizationId
      },
      include: {
        user: true
      }
    });

    if (!existing) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (existing.status !== "INVITED") {
      throw new Error("INVITE_NOT_PENDING");
    }

    const invite = createInviteToken();
    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: input.memberId
        },
        data: {
          inviteTokenHash: invite.tokenHash,
          inviteExpiresAt: invite.expiresAt,
          inviteAcceptedAt: null,
          inviteCanceledAt: null
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.user.id,
          action: "member.invite_resent",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            email: updated.invitedEmail ?? updated.user.email,
            role: updated.role
          }
        }
      });

      return updated;
    });

    return {
      member: mapMember(member),
      inviteUrl: buildInviteUrl(invite.token),
      expiresAt: invite.expiresAt.toISOString()
    };
  },

  async cancelInvite(input) {
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: input.organizationId,
      permission: "members:manage"
    });

    const existing = await prisma.organizationMember.findFirst({
      where: {
        id: input.memberId,
        organizationId: input.organizationId
      }
    });

    if (!existing) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (existing.status !== "INVITED") {
      throw new Error("INVITE_NOT_PENDING");
    }

    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: input.memberId
        },
        data: {
          status: "CANCELED",
          inviteTokenHash: null,
          inviteExpiresAt: null,
          inviteCanceledAt: new Date()
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: input.organizationId,
          userId: input.user.id,
          action: "member.invite_canceled",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            email: updated.invitedEmail ?? updated.user.email,
            role: updated.role
          }
        }
      });

      return updated;
    });

    return mapMember(member);
  },

  async acceptInvite(input) {
    const parsed = acceptInviteSchema.parse({ token: input.token });
    const tokenHash = hashInviteToken(parsed.token);
    const existing = await prisma.organizationMember.findUnique({
      where: {
        inviteTokenHash: tokenHash
      },
      include: {
        user: true
      }
    });

    if (!existing) {
      throw new Error("INVITE_NOT_FOUND");
    }

    if (existing.status !== "INVITED") {
      throw new Error("INVITE_NOT_PENDING");
    }

    if (!existing.inviteExpiresAt || existing.inviteExpiresAt <= new Date()) {
      throw new Error("INVITE_EXPIRED");
    }

    if (existing.user.email !== input.user.email) {
      throw new Error("INVITE_EMAIL_MISMATCH");
    }

    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: existing.id
        },
        data: {
          status: "ACTIVE",
          inviteTokenHash: null,
          inviteExpiresAt: null,
          inviteAcceptedAt: new Date()
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: existing.organizationId,
          userId: input.user.id,
          action: "member.accepted_invite",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            email: input.user.email,
            role: updated.role
          }
        }
      });

      return updated;
    });

    return mapMember(member);
  },

  async updateMemberRole(input) {
    const parsed: UpdateMemberRoleInput = updateMemberRoleSchema.parse(input);
    await requireDbOrganizationAccess({
      userId: input.user.id,
      organizationId: parsed.organizationId,
      permission: "members:manage"
    });

    const existing = await prisma.organizationMember.findFirst({
      where: {
        id: parsed.memberId,
        organizationId: parsed.organizationId
      }
    });

    if (!existing) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (existing.userId === input.user.id) {
      throw new Error("CANNOT_CHANGE_OWN_ROLE");
    }

    if (existing.role === "OWNER") {
      throw new Error("OWNER_ROLE_IS_PROTECTED");
    }

    const member = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationMember.update({
        where: {
          id: parsed.memberId
        },
        data: {
          role: parsed.role
        },
        include: {
          user: true
        }
      });

      await tx.activityLog.create({
        data: {
          organizationId: parsed.organizationId,
          userId: input.user.id,
          action: "member.role_updated",
          entityType: "OrganizationMember",
          entityId: updated.id,
          metadata: {
            role: parsed.role
          }
        }
      });

      return updated;
    });

    return mapMember(member);
  }
};

async function ensureDbUser(user: AppUser): Promise<void> {
  await prisma.user.upsert({
    where: {
      id: user.id
    },
    update: {
      email: user.email,
      name: user.name
    },
    create: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
}

async function requireDbOrganizationAccess(input: {
  userId: string;
  organizationId: string;
  permission: Permission;
}) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: input.userId,
      organizationId: input.organizationId,
      status: "ACTIVE"
    }
  });

  if (!membership) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  assertPermission(membership.role, input.permission);
  return membership;
}

export async function canAccessOrganization(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      status: "ACTIVE"
    }
  });

  return membership ? hasPermission(membership.role, permission) : false;
}

async function uniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "organization";
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

function normalizeSyncedContentListOptions(
  options: SyncedContentListOptions | undefined
): Required<SyncedContentListOptions> {
  const limit = Number.isFinite(options?.limit)
    ? Math.min(Math.max(Math.trunc(options?.limit ?? 25), 1), 100)
    : 25;

  return {
    query: normalizeOptionalFilter(options?.query, 160),
    type: normalizeOptionalFilter(options?.type, 64),
    status: normalizeOptionalFilter(options?.status, 64),
    cursor: normalizeOptionalFilter(options?.cursor, 191),
    limit
  };
}

function normalizeOptionalFilter(value: string | undefined, maxLength: number): string {
  return value?.trim().slice(0, maxLength) ?? "";
}

function normalizeBacklogTaskListOptions(
  options: BacklogTaskListOptions | undefined
): BacklogTaskListQuery {
  return backlogTaskListQuerySchema.parse({
    status: options?.status,
    severity: options?.severity
  });
}

const backlogTaskStatuses = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "SNOOZED",
  "IGNORED"
] satisfies BacklogTask["status"][];

const backlogTaskSeverities = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
] satisfies BacklogTask["severity"][];

function buildEmptyBacklogSummary(): BacklogTaskSummary {
  return {
    total: 0,
    open: 0,
    done: 0,
    byStatus: Object.fromEntries(backlogTaskStatuses.map((status) => [status, 0])) as Record<
      BacklogTask["status"],
      number
    >,
    bySeverity: Object.fromEntries(
      backlogTaskSeverities.map((severity) => [severity, 0])
    ) as Record<BacklogTask["severity"], number>
  };
}

function buildBacklogSummary(
  total: number,
  statusGroups: Array<{
    status: BacklogTask["status"];
    _count?: true | { _all?: number };
  }>,
  severityGroups: Array<{
    severity: BacklogTask["severity"];
    _count?: true | { _all?: number };
  }>
): BacklogTaskSummary {
  const summary = buildEmptyBacklogSummary();
  summary.total = total;

  for (const group of statusGroups) {
    summary.byStatus[group.status] = readBacklogGroupCount(group);
  }

  for (const group of severityGroups) {
    summary.bySeverity[group.severity] = readBacklogGroupCount(group);
  }

  summary.open = summary.byStatus.TODO + summary.byStatus.IN_PROGRESS + summary.byStatus.IN_REVIEW;
  summary.done = summary.byStatus.DONE;

  return summary;
}

function readBacklogGroupCount(group: { _count?: true | { _all?: number } }): number {
  return typeof group._count === "object" ? (group._count._all ?? 0) : 0;
}

function mapSite(site: {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  status: Site["status"];
  createdAt: Date;
}): Site {
  return {
    id: site.id,
    organizationId: site.organizationId,
    name: site.name,
    url: site.url,
    status: site.status,
    createdAt: site.createdAt.toISOString()
  };
}

function mapActivityLog(log: {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
}): ActivityLog {
  return {
    id: log.id,
    organizationId: log.organizationId,
    userId: log.userId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: isMetadataObject(log.metadata) ? log.metadata : {},
    createdAt: log.createdAt.toISOString()
  };
}

function mapSyncedContentItem(item: {
  id: string;
  organizationId: string;
  siteId: string;
  externalId: string;
  type: string;
  url: string;
  title: string | null;
  status: string;
  modifiedAt: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
}): SyncedContentItem {
  return {
    id: item.id,
    organizationId: item.organizationId,
    siteId: item.siteId,
    externalId: item.externalId,
    type: item.type,
    url: item.url,
    title: item.title,
    status: item.status,
    modifiedAt: item.modifiedAt.toISOString(),
    firstSeenAt: item.firstSeenAt.toISOString(),
    lastSeenAt: item.lastSeenAt.toISOString()
  };
}

function mapBacklogTask(task: {
  id: string;
  organizationId: string;
  siteId: string;
  auditIssueId: string | null;
  title: string;
  url: string;
  issueType: string;
  status: BacklogTask["status"];
  severity: BacklogTask["severity"];
  potentialImpact: string | null;
  effortEstimate: number | null;
  assigneeId: string | null;
  dueDate: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): BacklogTask {
  return {
    id: task.id,
    organizationId: task.organizationId,
    siteId: task.siteId,
    auditIssueId: task.auditIssueId,
    title: task.title,
    url: task.url,
    issueType: task.issueType,
    status: task.status,
    severity: task.severity,
    potentialImpact: task.potentialImpact,
    effortEstimate: task.effortEstimate,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate?.toISOString() ?? null,
    tags: task.tags,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function mapCandidatePriorityToSeverity(priority: "low" | "medium" | "high") {
  if (priority === "high") {
    return "HIGH";
  }

  if (priority === "medium") {
    return "MEDIUM";
  }

  return "LOW";
}

function mapCandidatePriorityToEffort(priority: "low" | "medium" | "high"): number {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

function mapMember(member: {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberSummary["role"];
  status: OrganizationMemberSummary["status"];
  invitedEmail: string | null;
  inviteExpiresAt?: Date | null;
  inviteAcceptedAt?: Date | null;
  inviteCanceledAt?: Date | null;
  createdAt: Date;
  user: {
    email: string;
    name: string | null;
  };
}): OrganizationMemberSummary {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    email: member.user.email,
    name: member.user.name,
    invitedEmail: member.invitedEmail,
    inviteExpiresAt: member.inviteExpiresAt?.toISOString() ?? null,
    inviteAcceptedAt: member.inviteAcceptedAt?.toISOString() ?? null,
    inviteCanceledAt: member.inviteCanceledAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString()
  };
}

function isMetadataObject(
  input: unknown
): input is Record<string, string | number | boolean | null> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }

  return Object.values(input).every(
    (value) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
