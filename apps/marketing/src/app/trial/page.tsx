import type { Metadata } from "next";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";

import { appUrl, pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Start a 14-Day Trial",
  description:
    "Start a 14-day SEO Content Control Center trial for one WordPress site, up to 500 URLs, and two team members.",
  path: "/trial"
});

type TrialPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const trialIncludes = [
  "One WordPress site and up to 500 URLs",
  "Two users with role-based access",
  "Search Console evidence and SEO audits",
  "Prioritized backlog and safe-operation workflow"
];

export default async function TrialPage({ searchParams }: TrialPageProps) {
  const params = (await searchParams) ?? {};
  const selectedPlan = normalizePlan(readParam(params.plan));
  const registerUrl = appUrl("/auth/register");

  return (
    <main className="trial-page">
      <section className="trial-copy">
        <span className="eyebrow">14-day product trial</span>
        <h1>Use one real site to decide if the workflow fits.</h1>
        <p>
          Start with a secure account, create your organization, and connect WordPress when you are
          ready. The trial is intentionally scoped so your team can evaluate the evidence-to-backlog
          workflow without opening broad production access.
        </p>
        <ul className="trial-list">
          {trialIncludes.map((item) => (
            <li key={item}>
              <Check size={17} /> {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="trial-form-panel">
        <span className="plan-label">Free for 14 days</span>
        <h2>Create your secure account</h2>
        <p>
          Enter your work email and continue to the SaaS signup. You will set a password before any
          site connection is created.
        </p>
        <form className="trial-form" action={registerUrl} method="get">
          <label htmlFor="trial-email">Work email</label>
          <input
            id="trial-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
          {selectedPlan ? <input name="plan" type="hidden" value={selectedPlan} /> : null}
          <input name="source" type="hidden" value="marketing-trial" />
          <button className="button" type="submit">
            Continue to secure signup <ArrowRight size={17} />
          </button>
        </form>
        <span className="secure-note">
          <LockKeyhole size={15} /> No WordPress credentials are requested on this page.
        </span>
        <p className="trial-legal">
          By creating an account, you agree to the <a href="/terms">Terms</a> and acknowledge the{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function normalizePlan(value: string): string {
  return ["starter", "pro", "agency"].includes(value.toLowerCase()) ? value.toUpperCase() : "";
}
