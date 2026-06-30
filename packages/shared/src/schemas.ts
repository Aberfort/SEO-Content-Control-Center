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
export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type PluginSyncBatch = z.infer<typeof pluginSyncBatchSchema>;
