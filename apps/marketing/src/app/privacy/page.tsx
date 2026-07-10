import type { Metadata } from "next";

import { LegalPage } from "../../components/legal-page";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How SEO Content Control Center collects, uses, protects, and retains account, WordPress, Search Console, and marketing data.",
  path: "/privacy"
});

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      summary="This policy explains the categories of information processed by SEO Content Control Center and the choices available to account holders and website visitors."
      sections={[
        {
          title: "1. Information we collect",
          content: (
            <>
              <p>
                We process account details such as name, email address, password-derived hashes,
                organization memberships, role assignments, billing status, and authentication
                security settings.
              </p>
              <p>
                When you connect a service, we process the minimum connection data needed to provide
                the product. This can include WordPress site URLs and content metadata, Google
                Search Console properties and performance rows, encrypted integration tokens, audit
                findings, backlog tasks, operation history, and support or demo request content.
              </p>
            </>
          )
        },
        {
          title: "2. How we use information",
          content: (
            <p>
              We use information to authenticate users, maintain tenant-isolated workspaces, sync
              connected services, run requested audits and operations, enforce plan limits, deliver
              notifications, investigate failures, protect the service, process billing, and respond
              to sales or support requests.
            </p>
          )
        },
        {
          title: "3. Connected services",
          content: (
            <p>
              WordPress and Google Search Console connections are initiated by authorized users.
              OAuth and plugin credentials are used only for the requested connection workflows and
              are encrypted before database persistence. Revoking a provider connection can prevent
              future syncs but does not automatically erase previously imported records.
            </p>
          )
        },
        {
          title: "4. Service providers and transfers",
          content: (
            <p>
              Infrastructure, database, queue, payment, error-reporting, and analytics providers may
              process limited information on our behalf. Production deployments should identify the
              specific vendors and regions used in the applicable customer agreement or
              subprocessors list. We do not sell personal information.
            </p>
          )
        },
        {
          title: "5. Retention and deletion",
          content: (
            <p>
              We retain information while an account is active and as needed for security, audit,
              billing, dispute, and legal obligations. Authorized account contacts may request
              export or deletion. Some event and backup records may remain for a limited period
              before aging out of protected storage.
            </p>
          )
        },
        {
          title: "6. Security",
          content: (
            <p>
              Controls include role-based tenant access, encrypted integration secrets, optional
              TOTP two-factor authentication, signed plugin operations, audit logging, dependency
              scanning, and static analysis. No internet service can guarantee absolute security.
            </p>
          )
        },
        {
          title: "7. Your choices and rights",
          content: (
            <p>
              Depending on your location, you may have rights to access, correct, export, restrict,
              or delete personal information. Organization owners and administrators can manage many
              account records directly. Other requests can be submitted through the demo contact
              form with “Security review” selected.
            </p>
          )
        },
        {
          title: "8. Changes to this policy",
          content: (
            <p>
              We may update this policy as the service, vendors, or legal requirements change. The
              effective date above identifies the current version. Material changes should be
              communicated to active account contacts through the service or email.
            </p>
          )
        }
      ]}
    />
  );
}
