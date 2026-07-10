import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardCheck,
  DatabaseBackup,
  FileClock,
  KeyRound,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../components/cta-band";
import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Security",
  description:
    "Review the tenant isolation, access controls, encrypted credentials, TOTP two-factor authentication, audit logs, and safe-operation controls behind SEO Content Control Center.",
  path: "/security"
});

const safeguards = [
  {
    icon: UsersRound,
    title: "Tenant isolation and RBAC",
    body: "Every organization-scoped read and mutation verifies membership. Owner, Admin, Member, and Viewer roles constrain sensitive actions."
  },
  {
    icon: LockKeyhole,
    title: "Encrypted integration secrets",
    body: "Google refresh tokens, WordPress apply tokens, and TOTP secrets are encrypted before database persistence."
  },
  {
    icon: KeyRound,
    title: "TOTP two-factor authentication",
    body: "Users can enroll an authenticator app. Login verification prevents reuse of an already accepted TOTP counter."
  },
  {
    icon: ShieldCheck,
    title: "Review-first WordPress writes",
    body: "Supported changes require preview, validation, dry run, explicit confirmation, signed execution, and a recorded result."
  },
  {
    icon: FileClock,
    title: "Auditability",
    body: "Membership, connections, tasks, billing, and bulk operation activity remains associated with organization and actor context."
  },
  {
    icon: ScanSearch,
    title: "Secure delivery checks",
    body: "CI runs dependency auditing and CodeQL analysis alongside linting, tests, builds, database migration verification, and PHP checks."
  },
  {
    icon: DatabaseBackup,
    title: "Restore verification",
    body: "A disposable-database smoke workflow validates that PostgreSQL backups can be restored and migration history can be read."
  },
  {
    icon: ClipboardCheck,
    title: "Bounded background work",
    body: "Queue payloads carry tenant scope, use deterministic job identifiers where needed, and expose failure and lag signals for operations."
  }
];

export default function SecurityPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Security and trust"
        title="Controls designed for teams that can change production websites."
        body="SEO Content Control Center treats tenant boundaries, credentials, approvals, and audit history as product requirements, not deployment footnotes."
        actions={
          <Link className="button" href="/demo">
            Discuss your requirements <ArrowRight size={17} />
          </Link>
        }
      />

      <section className="security-principles">
        <div>
          <span className="principle-number">01</span>
          <strong>Least privilege</strong>
          <p>Access is granted through organization membership and role checks.</p>
        </div>
        <div>
          <span className="principle-number">02</span>
          <strong>Explicit approval</strong>
          <p>Risky SEO operations stay behind a visible human confirmation step.</p>
        </div>
        <div>
          <span className="principle-number">03</span>
          <strong>Recoverable change</strong>
          <p>Supported write fields capture prior state for restoration workflows.</p>
        </div>
        <div>
          <span className="principle-number">04</span>
          <strong>Evidence trail</strong>
          <p>Critical activity is recorded with tenant, actor, state, and outcome context.</p>
        </div>
      </section>

      <section className="section section-tint">
        <div className="section-heading">
          <span className="eyebrow">Implemented safeguards</span>
          <h2>Security controls across account, application, plugin, and delivery layers.</h2>
          <p>
            The list below describes controls present in the product today. Enterprise SSO and a
            formal compliance package remain roadmap items and are not represented as complete.
          </p>
        </div>
        <div className="security-grid">
          {safeguards.map(({ icon: Icon, title, body }) => (
            <article key={title}>
              <Icon size={21} />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section disclosure-section">
        <div>
          <span className="eyebrow">Responsible disclosure</span>
          <h2>Found a potential security issue?</h2>
        </div>
        <p>
          Do not include credentials, customer content, or active exploit details in a public issue.
          Use the demo contact form and select “Security review” so the report can be routed
          privately.
        </p>
        <Link className="button button-secondary" href="/demo?topic=security">
          Contact security
        </Link>
      </section>

      <CtaBand
        eyebrow="Review the controls together"
        title="Bring your security and workflow questions to a guided demo."
        body="We will distinguish implemented controls from roadmap items and walk through the review-first operation flow."
      />
    </main>
  );
}
