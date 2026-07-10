import type { Metadata } from "next";

import { LegalPage } from "../../components/legal-page";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Terms governing access to SEO Content Control Center, connected WordPress sites, subscriptions, acceptable use, and review-first operations.",
  path: "/terms"
});

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms govern access to SEO Content Control Center. A signed order form or customer agreement may add to or replace portions of these terms."
      sections={[
        {
          title: "1. Accounts and authority",
          content: (
            <p>
              You must provide accurate account information and protect authentication credentials.
              You represent that you are authorized to connect each organization, WordPress site,
              and Google Search Console property added to the service. Organization owners are
              responsible for membership and role assignments.
            </p>
          )
        },
        {
          title: "2. The service",
          content: (
            <p>
              The service provides WordPress content synchronization, Search Console analysis, SEO
              audits, backlog management, recommendations, and controlled operation workflows.
              Features and limits vary by plan. Preview or assistant output is informational and
              should be reviewed by a qualified user before production use.
            </p>
          )
        },
        {
          title: "3. Review-first operations",
          content: (
            <p>
              Authorized users remain responsible for approving changes to connected sites. The
              product uses preview, validation, dry-run, confirmation, audit, and restoration
              controls for supported operations, but those controls do not replace your own backups,
              staging, change-management, or editorial review procedures.
            </p>
          )
        },
        {
          title: "4. Acceptable use",
          content: (
            <p>
              You may not use the service to access systems without authorization, introduce
              malicious code, evade plan or security controls, disrupt availability, probe another
              tenant, resell access without agreement, or process content that violates law or
              third-party rights.
            </p>
          )
        },
        {
          title: "5. Trials, fees, and cancellation",
          content: (
            <p>
              Trials are time-limited and may have lower usage limits. Paid subscriptions renew for
              the period shown at checkout or in an order form until canceled. Taxes, payment
              timing, refunds, and enterprise commitments are governed by the applicable checkout
              terms or signed agreement.
            </p>
          )
        },
        {
          title: "6. Customer data and feedback",
          content: (
            <p>
              You retain rights in your content and connected-service data. You grant us the limited
              right to process that data to provide, secure, support, and improve the service.
              Feedback may be used without restriction, provided it does not identify your
              confidential data.
            </p>
          )
        },
        {
          title: "7. Availability and warranties",
          content: (
            <p>
              The service may change and may experience interruptions. Unless a signed agreement
              says otherwise, it is provided on an “as is” and “as available” basis. We do not
              guarantee search rankings, traffic growth, specific SEO outcomes, or uninterrupted
              third-party integrations.
            </p>
          )
        },
        {
          title: "8. Liability and termination",
          content: (
            <p>
              Each party remains responsible for obligations that cannot be limited by law.
              Additional liability limits, governing law, dispute procedures, and termination rights
              should be specified in the applicable commercial agreement before production purchase.
            </p>
          )
        }
      ]}
    />
  );
}
