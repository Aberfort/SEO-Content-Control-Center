export const planCodes = ["TRIAL", "STARTER", "PRO", "AGENCY", "ENTERPRISE"] as const;

export type PlanCode = (typeof planCodes)[number];

export type PlanLimits = {
  sites: number | "custom";
  urlsPerSite: number | "custom";
  users: number | "custom";
  aiCredits: number;
  apiAccess: boolean;
};

export const planLimits = {
  TRIAL: {
    sites: 1,
    urlsPerSite: 500,
    users: 2,
    aiCredits: 0,
    apiAccess: false
  },
  STARTER: {
    sites: 1,
    urlsPerSite: 5000,
    users: 3,
    aiCredits: 0,
    apiAccess: false
  },
  PRO: {
    sites: 5,
    urlsPerSite: 50000,
    users: 10,
    aiCredits: 500,
    apiAccess: false
  },
  AGENCY: {
    sites: 50,
    urlsPerSite: 250000,
    users: 50,
    aiCredits: 2500,
    apiAccess: true
  },
  ENTERPRISE: {
    sites: "custom",
    urlsPerSite: "custom",
    users: "custom",
    aiCredits: 10000,
    apiAccess: true
  }
} satisfies Record<PlanCode, PlanLimits>;
