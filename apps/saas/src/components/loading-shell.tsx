import { navItems } from "@/app/page";
import { siteName } from "@/lib/brand";

type LoadingShellProps = {
  cardCount?: number;
};

export function LoadingShell({ cardCount = 2 }: LoadingShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">{siteName}</div>
          <div className="sidebar-account skeleton-account">
            <span className="skeleton-block" style={{ height: 12, width: 150 }} />
            <span className="skeleton-block" style={{ height: 12, width: 70 }} />
          </div>
        </div>
        <nav className="nav" aria-label="Main navigation" aria-hidden="true">
          {navItems.map((item) => (
            <span className="skeleton-nav-item" key={item.label}>
              <item.icon size={17} strokeWidth={2} aria-hidden="true" />
              <span className="skeleton-block" style={{ height: 10, width: 60 }} />
            </span>
          ))}
        </nav>
      </aside>
      <main className="main" aria-busy="true" aria-live="polite">
        <span className="visually-hidden">Loading workspace</span>
        <div className="skeleton-page-header">
          <span className="skeleton-block" style={{ height: 26, width: 220 }} />
          <span className="skeleton-block" style={{ height: 40, width: 160 }} />
        </div>
        <div className="skeleton-cards">
          {Array.from({ length: cardCount }, (_, index) => (
            <div className="skeleton-card" key={index}>
              <span className="skeleton-block" style={{ height: 14, width: 130 }} />
              {Array.from({ length: 3 }, (_, rowIndex) => (
                <div className="skeleton-card-row" key={rowIndex}>
                  <span className="skeleton-block" style={{ height: 10, width: 10, borderRadius: 999 }} />
                  <span className="skeleton-block" style={{ height: 12, flex: 1 }} />
                  <span className="skeleton-block" style={{ height: 28, width: 90 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
