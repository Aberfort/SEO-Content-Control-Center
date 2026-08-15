export const planCodes = ["TRIAL", "STARTER", "PRO", "AGENCY", "ENTERPRISE"] as const;

export type PlanCode = (typeof planCodes)[number];

export type PlanLimits = {
  sites: number | "custom";
  urlsPerSite: number | "custom";
  users: number | "custom";
  aiCredits: number;
};

export const planLimits = {
  TRIAL: {
    sites: 1,
    urlsPerSite: 500,
    users: 2,
    aiCredits: 0
  },
  STARTER: {
    sites: 1,
    urlsPerSite: 5000,
    users: 3,
    aiCredits: 0
  },
  PRO: {
    sites: 5,
    urlsPerSite: 50000,
    users: 10,
    aiCredits: 500
  },
  AGENCY: {
    sites: 50,
    urlsPerSite: 250000,
    users: 50,
    aiCredits: 2500
  },
  ENTERPRISE: {
    sites: "custom",
    urlsPerSite: "custom",
    users: "custom",
    aiCredits: 10000
  }
} satisfies Record<PlanCode, PlanLimits>;
