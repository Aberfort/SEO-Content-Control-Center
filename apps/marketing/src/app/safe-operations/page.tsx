import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Eye, FlaskConical, RotateCcw } from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../components/cta-band";
import { PageIntro } from "../../components/page-intro";
import { StructuredData } from "../../components/structured-data";
import { breadcrumbSchema, faqSchema } from "../../lib/schema";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Safe, Reversible WordPress SEO Changes",
  description:
    "Preview, dry run, confirm, and roll back every WordPress SEO change Content Signal proposes, with a full audit trail from evidence to result.",
  path: "/safe-operations"
});

const proof = [
  { value: "3 fix types", label: "Title, meta description, canonical, and noindex/nofollow" },
  { value: "0 auto-published", label: "Every change waits for explicit confirmation" },
  { value: "Full audit trail", label: "Preview, dry run, confirmation, result, and rollback" }
];

const steps = [
  {
    icon: Eye,
    marker: "1. Preview",
    title: "See the exact change before anything happens",
    body: "Every proposed fix shows the before-and-after value for the field it would change, tied to the synced content and the audit or Search Console evidence that flagged it."
  },
  {
    icon: FlaskConical,
    marker: "2. Dry run",
    title: "Know the outcome before it's real",
    body: "The same operation runs without writing to WordPress, so the per-item result — apply, skip, or no-op — is known ahead of the actual execution, not discovered after it."
  },
  {
    icon: CheckCircle2,
    marker: "3. Confirm",
    title: "Nothing moves without a person saying so",
    body: "Unsupported issue types, missing synced content, and metadata that's already correct are excluded from the run automatically. What remains still waits for an explicit confirmation."
  },
  {
    icon: RotateCcw,
    marker: "4. Rollback",
    title: "Every completed change can be undone",
    body: "The previous WordPress value is captured before anything is written. If a result needs reversing, the worker restores it and logs the restoration next to the original change."
  }
];

const executableToday = [
  "Missing SEO titles and meta descriptions, written to whichever supported plugin's fields are populated",
  "Canonical mismatches, repaired to point a page back to its own URL",
  "Noindex or nofollow directives, cleared only when incorrectly enabled on published content",
  "Every operation logged: preview, dry run, confirmation, start, result, and rollback"
];

const faqEntries = [
  {
    question: "What kinds of changes can actually be executed today?",
    answer:
      "Missing SEO titles and meta descriptions, canonical repairs that point a page back to its own URL, and clearing an incorrectly enabled noindex or nofollow directive on published content. Anything outside those three stays a manual task."
  },
  {
    question: "Can a change go live without anyone approving it?",
    answer:
      "No. Every supported operation requires an explicit confirmation after its preview and dry run, and unsupported or ambiguous cases are excluded from the run automatically instead of executed with a guess."
  },
  {
    question: "What happens if a change turns out to be wrong?",
    answer:
      "The previous WordPress value was captured before the change was written. A rollback restores it and logs the restoration next to the original operation, so the history stays intact either way."
  },
  {
    question: "Does this depend on which SEO plugin I use?",
    answer:
      "No. Supported operations read and write through whichever fields Yoast or Rank Math already populate, with a documented fallback when neither is active."
  }
];

export default function SafeOperationsPage() {
  return (
    <main>
      <StructuredData
        id="safe-operations-schema"
        data={[
          faqSchema(faqEntries),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Safe operations", path: "/safe-operations" }
          ])
        ]}
      />

      <PageIntro
        eyebrow="How execution works"
        title="Every change is proposed, previewed, and reversible."
        body="Content Signal doesn't just tell you what's wrong. Supported SEO fixes move through preview, dry run, and explicit confirmation before anything reaches WordPress, and every completed change keeps enough history to be undone."
        actions={
          <>
            <Link className="button" href="/trial">
              Start free trial <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/demo">
              Request a demo
            </Link>
          </>
        }
      />

      <section className="solution-proof" aria-label="Safe operations outcomes">
        {proof.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="section product-spine-section">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">Four steps, every time</span>
            <h2>The same path for a single fix or a bulk operation.</h2>
          </div>
          <p>
            There is no separate &quot;fast&quot; path that skips a step. A bulk operation across
            hundreds of pages moves through the same preview, dry run, and confirmation as a single
            title fix &mdash; just batched.
          </p>
        </div>
        <div className="product-spine">
          {steps.map(({ icon: Icon, marker, title, body }) => (
            <article key={marker}>
              <div>
                <span>{marker}</span>
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Bounded on purpose</span>
          <h2>What&rsquo;s executable today, stated narrowly.</h2>
        </div>
        <ul className="check-list">
          {executableToday.map((point) => (
            <li key={point}>
              <CheckCircle2 size={17} />
              {point}
            </li>
          ))}
        </ul>
        <p className="section-note">
          Running this alongside an existing SEO plugin? Read how it works with{" "}
          <Link href="/blog/yoast-rank-math-together">Yoast and Rank Math</Link>.
        </p>
      </section>

      <section className="section faq-section">
        <div className="section-heading">
          <span className="eyebrow">Common questions</span>
          <h2>The controls behind the word &ldquo;safe.&rdquo;</h2>
          <p>
            What&rsquo;s actually bounded, what still needs a person, and what happens when
            something needs to be undone.
          </p>
        </div>
        <div className="faq-list">
          {faqEntries.map((entry) => (
            <details key={entry.question}>
              <summary>{entry.question}</summary>
              <p>{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBand
        eyebrow="See it on a real site"
        title="Preview a supported fix on your own WordPress content."
        body="Start a scoped trial, or request a walkthrough that follows a real proposed change from evidence to confirmation."
      />
    </main>
  );
}
