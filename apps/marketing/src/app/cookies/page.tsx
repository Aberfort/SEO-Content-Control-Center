import type { Metadata } from "next";

import { LegalPage } from "../../components/legal-page";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "How SEO Content Control Center uses essential session storage and optional analytics technologies on its marketing site and SaaS application.",
  path: "/cookies"
});

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie Policy"
      summary="This policy describes browser storage used by the public marketing site and authenticated SaaS application. The production cookie inventory should be reviewed whenever analytics or support vendors change."
      sections={[
        {
          title: "1. Essential storage",
          content: (
            <p>
              The SaaS application uses secure session storage to keep authenticated users signed in
              and to protect account workflows. Essential storage cannot be disabled through a
              consent preference when it is required to provide the requested account function.
            </p>
          )
        },
        {
          title: "2. Analytics",
          content: (
            <p>
              Server-side product analytics can be enabled by the deployment operator through an
              environment setting. Analytics events use an explicit event taxonomy and are designed
              to exclude prompts, request bodies, credentials, and environment secrets. The public
              marketing site does not set advertising cookies in the current implementation.
            </p>
          )
        },
        {
          title: "3. Third-party services",
          content: (
            <p>
              Payment, authentication, embedded media, support, or scheduling providers may set
              their own browser storage when those features are introduced or opened. Their policies
              govern that storage. Production deployments should not add non-essential tags without
              an appropriate consent mechanism for the intended regions.
            </p>
          )
        },
        {
          title: "4. Browser controls",
          content: (
            <p>
              Most browsers let you remove or block cookies and site storage. Blocking essential
              session storage can prevent login and other authenticated features from working.
              Browser controls do not remove server-side account records.
            </p>
          )
        },
        {
          title: "5. Policy updates",
          content: (
            <p>
              We will update this policy if the service introduces new analytics, advertising,
              embedded, or support technologies. The effective date above identifies the current
              version.
            </p>
          )
        }
      ]}
    />
  );
}
