import type { ReactNode } from "react";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  body: string;
  actions?: ReactNode;
};

export function PageIntro({ eyebrow, title, body, actions }: PageIntroProps) {
  return (
    <section className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{body}</p>
      {actions ? <div className="hero-actions">{actions}</div> : null}
    </section>
  );
}
