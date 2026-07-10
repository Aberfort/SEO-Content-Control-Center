export const demoTopics = [
  "Product demo",
  "Agency workflow",
  "Enterprise plan",
  "Security review"
] as const;

export type DemoTopic = (typeof demoTopics)[number];

export type DemoLead = {
  name: string;
  workEmail: string;
  company: string;
  website: string | null;
  role: string;
  siteCount: string;
  topic: DemoTopic;
  notes: string | null;
};

export type DemoLeadActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<keyof DemoLead | "consent", string>>;
};

type DemoLeadParseResult =
  | { success: true; data: DemoLead }
  | {
      success: false;
      errors: NonNullable<DemoLeadActionState["fieldErrors"]>;
    };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseDemoLead(input: Record<string, unknown>): DemoLeadParseResult {
  const name = readText(input.name);
  const workEmail = readText(input.workEmail).toLowerCase();
  const company = readText(input.company);
  const website = readText(input.website);
  const role = readText(input.role);
  const siteCount = readText(input.siteCount);
  const topic = readText(input.topic);
  const notes = readText(input.notes);
  const consent = input.consent === true || input.consent === "on";
  const errors: NonNullable<DemoLeadActionState["fieldErrors"]> = {};

  if (name.length < 2 || name.length > 100) {
    errors.name = "Enter your name (2-100 characters).";
  }

  if (!emailPattern.test(workEmail) || workEmail.length > 254) {
    errors.workEmail = "Enter a valid work email.";
  }

  if (company.length < 2 || company.length > 120) {
    errors.company = "Enter your company or team name.";
  }

  if (website && !isPublicWebsiteUrl(website)) {
    errors.website = "Use a full http:// or https:// website URL.";
  }

  if (!role || role.length > 80) {
    errors.role = "Select the role closest to yours.";
  }

  if (!siteCount || siteCount.length > 40) {
    errors.siteCount = "Select the number of WordPress sites you manage.";
  }

  if (!demoTopics.includes(topic as DemoTopic)) {
    errors.topic = "Select a conversation topic.";
  }

  if (notes.length > 1200) {
    errors.notes = "Keep additional context under 1,200 characters.";
  }

  if (!consent) {
    errors.consent = "Confirm that we may contact you about this request.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name,
      workEmail,
      company,
      website: website || null,
      role,
      siteCount,
      topic: topic as DemoTopic,
      notes: notes || null
    }
  };
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isPublicWebsiteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}
