"use server";

import { headers } from "next/headers";

import { parseDemoLead, type DemoLead, type DemoLeadActionState } from "../lib/demo-lead";

const rateLimitWindowMs = 15 * 60 * 1000;
const rateLimitMaxRequests = 5;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalWithDemoRateLimits = globalThis as typeof globalThis & {
  scccDemoRateLimits?: Map<string, RateLimitBucket>;
};

const demoRateLimits =
  globalWithDemoRateLimits.scccDemoRateLimits ??
  (globalWithDemoRateLimits.scccDemoRateLimits = new Map<string, RateLimitBucket>());

export async function submitDemoLeadAction(
  _previousState: DemoLeadActionState,
  formData: FormData
): Promise<DemoLeadActionState> {
  const honeypot = String(formData.get("companyFax") ?? "").trim();

  if (honeypot) {
    return successState;
  }

  const parsed = parseDemoLead({
    name: formData.get("name"),
    workEmail: formData.get("workEmail"),
    company: formData.get("company"),
    website: formData.get("website"),
    role: formData.get("role"),
    siteCount: formData.get("siteCount"),
    topic: formData.get("topic"),
    notes: formData.get("notes"),
    consent: formData.get("consent")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Review the highlighted fields and try again.",
      fieldErrors: parsed.errors
    };
  }

  const requestHeaders = await headers();
  const clientKey = readClientKey(requestHeaders);

  if (!consumeDemoRateLimit(clientKey, Date.now())) {
    return {
      status: "error",
      message: "Too many demo requests. Please wait 15 minutes and try again."
    };
  }

  try {
    await deliverDemoLead(parsed.data, requestHeaders.get("user-agent"));
    return successState;
  } catch (error) {
    console.error("Marketing demo lead delivery failed", {
      error: error instanceof Error ? error.message : "Unknown delivery error"
    });
    return {
      status: "error",
      message: "We could not send your request right now. Please try again shortly."
    };
  }
}

const successState: DemoLeadActionState = {
  status: "success",
  message: "Thanks. We received your request and will follow up with the next available time."
};

async function deliverDemoLead(lead: DemoLead, userAgent: string | null): Promise<void> {
  const webhookUrl = process.env.SCCC_MARKETING_LEAD_WEBHOOK_URL?.trim();
  const payload = {
    event: "marketing.demo_requested",
    submittedAt: new Date().toISOString(),
    source: "marketing-site",
    userAgent,
    lead
  };

  if (!webhookUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SCCC_MARKETING_LEAD_WEBHOOK_URL is not configured");
    }

    console.info("Marketing demo lead accepted in development", payload);
    return;
  }

  const secret = process.env.SCCC_MARKETING_LEAD_WEBHOOK_SECRET?.trim();
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { authorization: `Bearer ${secret}` } : {})
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`Lead webhook returned HTTP ${response.status}`);
  }
}

function readClientKey(requestHeaders: Headers): string {
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

function consumeDemoRateLimit(key: string, now: number): boolean {
  const existing = demoRateLimits.get(key);

  if (!existing || existing.resetAt <= now) {
    demoRateLimits.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    pruneRateLimits(now);
    return true;
  }

  if (existing.count >= rateLimitMaxRequests) {
    return false;
  }

  existing.count += 1;
  return true;
}

function pruneRateLimits(now: number): void {
  if (demoRateLimits.size < 500) {
    return;
  }

  for (const [key, bucket] of demoRateLimits) {
    if (bucket.resetAt <= now) {
      demoRateLimits.delete(key);
    }
  }
}
