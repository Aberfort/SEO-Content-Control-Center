import type { Metadata } from "next";
import Link from "next/link";

import { StructuredData } from "../../components/structured-data";
import { breadcrumbSchema } from "../../lib/schema";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "ContentSignalBot",
  description:
    "What ContentSignalBot is, which URLs it fetches, how to allow or block it, and how to reach us about its crawling behavior.",
  path: "/bot"
});

export default function BotPage() {
  return (
    <main className="legal-layout">
      <StructuredData
        id="bot-breadcrumb-schema"
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "ContentSignalBot", path: "/bot" }
        ])}
      />

      <header className="legal-intro">
        <span className="eyebrow">Crawler information</span>
        <h1>ContentSignalBot</h1>
        <p>
          ContentSignalBot fetches a single URL only when a Content Signal customer or a visitor
          using the <Link href="/tools/page-checker">free page checker</Link> explicitly requests
          it. It does not crawl your site on its own or follow links.
        </p>
      </header>

      <div className="legal-content">
        <section>
          <h2>User-Agent string</h2>
          <p>
            <code>ContentSignalBot/1.0 (+https://getcontentsignal.com/bot)</code>
          </p>
          <p>
            Every request this crawler makes carries this exact User-Agent header, so it can be
            matched precisely in logs, firewalls, and <code>robots.txt</code>.
          </p>
        </section>

        <section>
          <h2>What it does</h2>
          <p>
            ContentSignalBot performs a single, on-demand fetch of one URL at a time: either a page
            a Content Signal customer is monitoring, or a URL someone submits to the free page
            checker at <code>/tools/page-checker</code>. It reads the response once, extracts basic
            on-page signals (title, meta description, canonical, meta robots, presence of
            structured data), and discards the raw HTML afterward. It does not crawl beyond the
            requested URL, does not follow internal links to discover new pages, and does not run
            on a recurring schedule beyond what a customer has explicitly configured for their own
            monitored URLs.
          </p>
        </section>

        <section>
          <h2>What it never does</h2>
          <p>
            It never submits forms, executes JavaScript, stores personal data found on the page, or
            attempts to reach non-public addresses. Every hop, including redirects, is checked
            against a guard that blocks loopback, private, link-local, and other reserved network
            ranges before any request is made.
          </p>
        </section>

        <section>
          <h2>Allowing or blocking it</h2>
          <p>
            ContentSignalBot respects standard <code>robots.txt</code> directives for its
            User-Agent token, <code>ContentSignalBot</code>. To block it from a site entirely, add:
          </p>
          <p>
            <code>User-agent: ContentSignalBot</code>
            <br />
            <code>Disallow: /</code>
          </p>
          <p>
            Because each fetch is triggered by a specific request (a customer&rsquo;s monitored URL
            or a manual page-checker submission), blocking it only affects that one request rather
            than an ongoing crawl.
          </p>
        </section>

        <section>
          <h2>Questions about a request you received</h2>
          <p>
            If ContentSignalBot fetched a page on your site and you want to know why, contact us at{" "}
            <a href="mailto:getcontentsignal@gmail.com">getcontentsignal@gmail.com</a> with the URL
            and, if available, the timestamp from your server logs.
          </p>
        </section>
      </div>
    </main>
  );
}
