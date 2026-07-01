import { z } from "zod";

export const organizationIdSchema = z.string().uuid();
export const siteIdSchema = z.string().uuid();

export const tenantScopeSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema.optional()
});

export const siteCreateSchema = z.object({
  organizationId: organizationIdSchema,
  name: z.string().trim().min(2).max(120),
  url: z.string().url().max(2048)
});

export const organizationCreateSchema = z.object({
  name: z.string().trim().min(2).max(120)
});

export const organizationSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const authEmailSchema = z.string().trim().email().max(254).toLowerCase();

export const passwordSchema = z.string().min(10).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: authEmailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1).max(128)
});

export const assignableMemberRoleSchema = z.enum([
  "ADMIN",
  "SEO_MANAGER",
  "EDITOR",
  "WRITER",
  "VIEWER",
  "BILLING_MANAGER"
]);

export const inviteMemberSchema = z.object({
  organizationId: organizationIdSchema,
  email: authEmailSchema,
  role: assignableMemberRoleSchema
});

export const updateMemberRoleSchema = z.object({
  organizationId: organizationIdSchema,
  memberId: z.string().uuid(),
  role: assignableMemberRoleSchema
});

export const inviteTokenSchema = z.string().trim().min(32).max(256);

export const acceptInviteSchema = z.object({
  token: inviteTokenSchema
});

export const pluginConnectionChallengeCreateSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema
});

export const pluginConnectionChallengeSchema = z.string().trim().min(32).max(256);

export const pluginConnectionExchangeSchema = z.object({
  challenge: pluginConnectionChallengeSchema,
  endpoint: z.string().url().max(2048).optional()
});

export const pluginSyncItemSchema = z.object({
  externalId: z.string().min(1).max(191),
  type: z.enum(["post", "page", "custom_post_type", "taxonomy"]),
  url: z.string().url().max(2048),
  title: z.string().max(512).nullable(),
  status: z.string().max(64),
  modifiedAt: z.string().datetime()
});

export const pluginSyncBatchSchema = z.object({
  organizationId: organizationIdSchema,
  siteId: siteIdSchema,
  cursor: z.string().max(512).nullable(),
  items: z.array(pluginSyncItemSchema).max(250)
});

export type TenantScope = z.infer<typeof tenantScopeSchema>;
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AssignableMemberRole = z.infer<typeof assignableMemberRoleSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type PluginConnectionChallengeCreateInput = z.infer<
  typeof pluginConnectionChallengeCreateSchema
>;
export type PluginConnectionExchangeInput = z.infer<typeof pluginConnectionExchangeSchema>;
export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type PluginSyncBatch = z.infer<typeof pluginSyncBatchSchema>;
