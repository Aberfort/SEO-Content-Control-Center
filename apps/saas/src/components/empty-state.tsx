import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  children: ReactNode;
};

export function EmptyState({ icon: Icon, children }: EmptyStateProps) {
  return (
    <div className="empty-hint">
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
