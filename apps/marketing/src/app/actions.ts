"use server";

import { cookies, headers } from "next/headers";

import { captureMarketingEvent } from "../lib/analytics";
import { parseDemoLead, type DemoLead, type DemoLeadActionState } from "../lib/demo-lead";
import { consumeRateLimit, readClientKey } from "../lib/rate-limit";
import { anonymousDistinctId, visitorIdCookieName } from "../lib/visitor";

const demoRateLimit = { windowMs: 15 * 60 * 1000, maxRequests: 5 };

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

  if (!consumeRateLimit("demo", clientKey, demoRateLimit)) {
    return {
      status: "error",
      message: "Too many demo requests. Please wait 15 minutes and try again."
    };
  }

  try {
    await deliverDemoLead(parsed.data, requestHeaders.get("user-agent"));
    await captureDemoRequested(parsed.data);
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

/**
 * Fires the `demo_requested` funnel event. Only qualifying fields go into
 * PostHog properties — never the lead's name, email, company, or notes.
 */
async function captureDemoRequested(lead: DemoLead): Promise<void> {
  const cookieStore = await cookies();
  const distinctId = cookieStore.get(visitorIdCookieName)?.value || anonymousDistinctId();

  await captureMarketingEvent({
    event: "demo_requested",
    distinctId,
    properties: {
      role: lead.role,
      siteCount: lead.siteCount,
      topic: lead.topic
    }
  });
}

