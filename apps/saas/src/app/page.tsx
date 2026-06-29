import Link from "next/link";

const navItems = ["Dashboard", "Sites", "Audits", "Backlog", "Integrations", "Billing"];

export default function AppHomePage() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">SEO Content Control Center</div>
        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item}
              href={item === "Dashboard" ? "/" : "#"}
              aria-current={item === "Dashboard" ? "page" : undefined}
            >
              {item}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <div className="page-header">
          <div>
            <p className="eyebrow">Workspace setup</p>
            <h1>Connect WordPress, then turn audits into work.</h1>
          </div>
          <Link className="button" href="/dashboard">
            View dashboard
          </Link>
        </div>

        <section className="grid" aria-label="Setup summary">
          <article className="panel">
            <h2>No sites connected</h2>
            <p>Add a WordPress site to start sync, audit checks, and backlog generation.</p>
          </article>
          <article className="panel">
            <h2>No GSC property</h2>
            <p>Google Search Console insights will stay empty until OAuth is configured.</p>
          </article>
          <article className="panel">
            <h2>Safe operations only</h2>
            <p>Risky SEO changes require preview, dry run, confirmation, and audit logs.</p>
          </article>
        </section>

        <section className="panel empty-state" aria-labelledby="checklist-title">
          <h2 id="checklist-title">Onboarding checklist</h2>
          <ul className="checklist">
            <li>
              <span className="status-dot" aria-hidden="true" />
              Create organization
            </li>
            <li>
              <span className="status-dot" aria-hidden="true" />
              Add first WordPress site
            </li>
            <li>
              <span className="status-dot" aria-hidden="true" />
              Install plugin and complete connection flow
            </li>
            <li>
              <span className="status-dot" aria-hidden="true" />
              Run the first sync and audit
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
