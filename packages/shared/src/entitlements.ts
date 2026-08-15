import { planLimits, type PlanCode } from "./plans";

export const entitlementKeys = [
  "gscImpact",
  "recurringReports",
  "contentTrustEvidence",
  "aiSummaries",
  "safeOperations",
  "apiAccess"
] as const;

export const commercialCapabilityKeys = [
  "sites",
  "users",
  "urlsPerSite",
  ...entitlementKeys
] as const;

export type CommercialCapabilityKey = (typeof commercialCapabilityKeys)[number];

export type EntitlementKey = (typeof entitlementKeys)[number];
export type PlanEntitlements = Record<EntitlementKey, boolean>;

const paidCore = {
  gscImpact: true,
  recurringReports: true,
  contentTrustEvidence: true,
  safeOperations: true
} as const;

export const planEntitlements = {
  TRIAL: {
    gscImpact: false,
    recurringReports: false,
    contentTrustEvidence: false,
    aiSummaries: false,
    safeOperations: false,
    apiAccess: false
  },
  STARTER: {
    ...paidCore,
    aiSummaries: false,
    apiAccess: false
  },
  PRO: {
    ...paidCore,
    aiSummaries: true,
    apiAccess: false
  },
  AGENCY: {
    ...paidCore,
    aiSummaries: true,
    apiAccess: false
  },
  ENTERPRISE: {
    ...paidCore,
    aiSummaries: true,
    apiAccess: false
  }
} satisfies Record<PlanCode, PlanEntitlements>;

export type CommercialAccessMode = "full" | "read_only";

export type CommercialAccess = {
  planCode: PlanCode;
  mode: CommercialAccessMode;
  limits: (typeof planLimits)[PlanCode];
  entitlements: PlanEntitlements;
  disabledCode: string | null;
  disabledReason: string | null;
};

type SubscriptionAccessInput = {
  planCode?: PlanCode | null;
  status?: string | null;
  provider?: string | null;
  trialEndsAt?: Date | string | null;
  now?: Date;
};

export function resolveCommercialAccess(input: SubscriptionAccessInput = {}): CommercialAccess {
  const planCode = input.planCode ?? "TRIAL";
  const now = input.now ?? new Date();
  const trialEndsAt = parseDate(input.trialEndsAt);
  const localTrialExpired =
    input.provider == null &&
    input.status === "TRIALING" &&
    trialEndsAt !== null &&
    trialEndsAt.getTime() <= now.getTime();
  const inactiveStatus = input.status != null && !["ACTIVE", "TRIALING"].includes(input.status);
  const readOnly = localTrialExpired || inactiveStatus;

  return {
    planCode,
    mode: readOnly ? "read_only" : "full",
    limits: planLimits[planCode],
    entitlements: planEntitlements[planCode],
    disabledCode: readOnly ? "BILLING_READ_ONLY" : null,
    disabledReason: readOnly
      ? "Billing access is read-only. Upgrade or restore the subscription to continue."
      : null
  };
}

export function canUseEntitlement(access: CommercialAccess, entitlement: EntitlementKey): boolean {
  return access.mode === "full" && access.entitlements[entitlement];
}

export function assertEntitlement(access: CommercialAccess, entitlement: EntitlementKey): void {
  if (canUseEntitlement(access, entitlement)) return;

  if (access.mode === "read_only") {
    throw new Error(access.disabledCode ?? "BILLING_READ_ONLY");
  }

  throw new Error(`PLAN_${toConstantCase(entitlement)}_REQUIRED`);
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toConstantCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}
