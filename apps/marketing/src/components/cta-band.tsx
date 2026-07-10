import { ArrowRight } from "lucide-react";
import Link from "next/link";

type CtaBandProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
};

export function CtaBand({
  eyebrow = "Ready to replace the spreadsheet?",
  title = "Turn your next SEO audit into work your team can finish.",
  body = "Start with one WordPress site, connect Search Console, and build a prioritized backlog from real evidence."
}: CtaBandProps) {
  return (
    <section className="cta-band">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className="cta-band-actions">
        <Link className="button button-light" href="/trial">
          Start free trial
          <ArrowRight size={17} />
        </Link>
        <Link className="button button-ghost-light" href="/demo">
          Request a demo
        </Link>
      </div>
    </section>
  );
}
