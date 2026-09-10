import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  content: ReactNode;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
  /** Defaults to the original effective date so pages that haven't materially changed are unaffected. */
  effectiveDate?: string;
};

export function LegalPage({
  eyebrow,
  title,
  summary,
  sections,
  effectiveDate = "July 10, 2026"
}: LegalPageProps) {
  return (
    <main className="legal-layout">
      <header className="legal-intro">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{summary}</p>
        <small>Effective {effectiveDate}</small>
      </header>
      <div className="legal-content">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.content}
          </section>
        ))}
      </div>
    </main>
  );
}
