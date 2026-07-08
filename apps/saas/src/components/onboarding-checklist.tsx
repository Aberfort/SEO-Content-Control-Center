import Link from "next/link";

import type {
  OnboardingChecklist as OnboardingChecklistModel,
  OnboardingChecklistTarget
} from "@/lib/onboarding-checklist";

type OnboardingChecklistProps = {
  checklist: OnboardingChecklistModel;
  hrefs: Partial<Record<OnboardingChecklistTarget, string>>;
};

export function OnboardingChecklist({ checklist, hrefs }: OnboardingChecklistProps) {
  const nextStep = checklist.nextItem
    ? `Next: ${checklist.nextItem.title.toLowerCase()}.`
    : "Setup path complete.";

  return (
    <section className="panel onboarding-panel" aria-labelledby="onboarding-title">
      <div className="section-heading">
        <div>
          <h2 id="onboarding-title">Onboarding checklist</h2>
          <p>
            {checklist.completedCount}/{checklist.totalCount} complete. {nextStep}
          </p>
        </div>
        <span className="metric-pill">{checklist.progressPercent}% ready</span>
      </div>
      <div className="onboarding-progress" aria-hidden="true">
        <span style={{ width: `${checklist.progressPercent}%` }} />
      </div>
      <ol className="checklist onboarding-list">
        {checklist.items.map((item) => {
          const href = hrefs[item.target];

          return (
            <li key={item.id} className={`onboarding-item onboarding-item-${item.status}`}>
              <span className="status-dot" aria-hidden="true" />
              <div className="onboarding-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              {item.status === "complete" ? (
                <span className="onboarding-state">Done</span>
              ) : href ? (
                <Link className="text-button" href={href}>
                  {item.actionLabel}
                </Link>
              ) : (
                <span className="onboarding-state">{formatStatus(item.status)}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function formatStatus(status: "complete" | "current" | "upcoming"): string {
  return status === "current" ? "Next" : "Later";
}
