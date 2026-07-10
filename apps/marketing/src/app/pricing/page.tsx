import { planLimits, type PlanCode } from "@sccc/shared";
import type { Metadata } from "next";
import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../components/cta-band";
import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Compare Starter, Pro, Agency, and Enterprise plans for WordPress SEO operations, with a 14-day trial for one live site.",
  path: "/pricing"
});

type PublicPlan = {
  code: Exclude<PlanCode, "TRIAL">;
  name: string;
  price: string;
  cadence: string;
  description: string;
  recommended?: boolean;
};

const plans: PublicPlan[] = [
  {
    code: "STARTER",
    name: "Starter",
    price: "$49",
    cadence: "per month",
    description: "For a focused team operating one WordPress site."
  },
  {
    code: "PRO",
    name: "Pro",
    price: "$149",
    cadence: "per month",
    description: "For in-house teams and publishers managing a growing portfolio.",
    recommended: true
  },
  {
    code: "AGENCY",
    name: "Agency",
    price: "$399",
    cadence: "per month",
    description: "For agencies standardizing delivery across client sites."
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    cadence: "annual agreement",
    description: "For larger organizations with tailored scale and security needs."
  }
];

const comparisonRows: Array<{
  label: string;
  value: (code: PublicPlan["code"]) => string | boolean;
}> = [
  { label: "WordPress sites", value: (code) => formatLimit(planLimits[code].sites) },
  { label: "URLs per site", value: (code) => formatLimit(planLimits[code].urlsPerSite) },
  { label: "Team members", value: (code) => formatLimit(planLimits[code].users) },
  { label: "AI credits / month", value: (code) => formatLimit(planLimits[code].aiCredits) },
  { label: "API access", value: (code) => planLimits[code].apiAccess },
  { label: "Audit and rollback history", value: () => true },
  { label: "Google Search Console", value: () => true }
];

export default function PricingPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Plans that match your operating scale"
        title="Start with one site. Expand when the workflow earns it."
        body="Every paid plan includes the core WordPress sync, Search Console evidence, audits, backlog, safe operations, and audit history. Scale sites, URLs, users, and assistant usage as your team grows."
        actions={
          <Link className="button" href="/trial">
            Start 14-day trial <ArrowRight size={17} />
          </Link>
        }
      />

      <section className="pricing-grid" aria-label="Pricing plans">
        {plans.map((plan) => {
          const limits = planLimits[plan.code];

          return (
            <article
              className={`price-plan${plan.recommended ? " recommended" : ""}`}
              key={plan.code}
            >
              {plan.recommended ? <span className="plan-label">Recommended</span> : null}
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div className="plan-price">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>
              <ul className="plan-highlights">
                <li>
                  <Check size={16} /> {formatSiteLimit(limits.sites)}
                </li>
                <li>
                  <Check size={16} /> {formatLimit(limits.urlsPerSite)} URLs per site
                </li>
                <li>
                  <Check size={16} /> {formatLimit(limits.users)} team members
                </li>
              </ul>
              <Link
                className={`button${plan.recommended ? "" : " button-secondary"}`}
                href={
                  plan.code === "ENTERPRISE"
                    ? "/demo?plan=enterprise"
                    : `/trial?plan=${plan.code.toLowerCase()}`
                }
              >
                {plan.code === "ENTERPRISE" ? "Talk to sales" : "Start free trial"}
                <ArrowRight size={16} />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="section comparison-section">
        <div className="section-heading">
          <span className="eyebrow">Detailed comparison</span>
          <h2>Choose by operating scale, not by feature maze.</h2>
          <p>The core workflow stays intact across every paid plan.</p>
        </div>
        <div className="comparison-table" role="table" aria-label="Plan comparison">
          <div className="comparison-row comparison-head" role="row">
            <span role="columnheader">Capability</span>
            {plans.map((plan) => (
              <strong role="columnheader" key={plan.code}>
                {plan.name}
              </strong>
            ))}
          </div>
          {comparisonRows.map((row) => (
            <div className="comparison-row" role="row" key={row.label}>
              <span role="rowheader">{row.label}</span>
              {plans.map((plan) => {
                const value = row.value(plan.code);
                return (
                  <span role="cell" key={plan.code}>
                    {typeof value === "boolean" ? (
                      value ? (
                        <Check aria-label="Included" size={17} />
                      ) : (
                        <Minus aria-label="Not included" size={17} />
                      )
                    ) : (
                      value
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="section trial-note">
        <div>
          <span className="eyebrow">Included trial</span>
          <h2>14 days to validate the real workflow.</h2>
        </div>
        <p>
          The trial includes one site, 500 URLs, and two users. Checkout appears only when billing
          is configured, and any payment requirement is shown before a paid plan is activated.
        </p>
      </section>

      <CtaBand />
    </main>
  );
}

function formatLimit(value: number | "custom"): string {
  return value === "custom" ? "Custom" : new Intl.NumberFormat("en-US").format(value);
}

function formatSiteLimit(value: number | "custom"): string {
  if (value === "custom") {
    return "Custom sites";
  }

  return `${formatLimit(value)} ${value === 1 ? "site" : "sites"}`;
}
