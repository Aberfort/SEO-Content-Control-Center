const rows = [
  ["Guide: best running shoes", "CTR drop", "+18"],
  ["Review: standing desks", "Thin content", "+13"],
  ["Comparison: hosting plans", "Title duplicate", "+9"]
];

const features = [
  {
    title: "Traffic-loss discovery",
    body: "Spot pages with falling clicks, impressions, CTR, or position before they disappear into spreadsheets."
  },
  {
    title: "Prioritized SEO backlog",
    body: "Turn audit issues into work that includes evidence, impact, effort, owner, and status."
  },
  {
    title: "Safe WordPress operations",
    body: "Prepare changes with preview, dry run, confirmation, audit logs, and rollback support."
  }
];

export default function MarketingHomePage() {
  return (
    <>
      <header className="site-header">
        <a className="logo" href="/">
          SEO Content Control Center
        </a>
        <nav className="nav" aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#features">Features</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <a className="cta" href="#demo">
          Request demo
        </a>
      </header>

      <main>
        <section className="hero">
          <div>
            <h1>Find the WordPress pages costing you traffic.</h1>
            <p>
              Connect WordPress and Google Search Console, detect SEO problems with evidence, and
              turn them into a prioritized backlog your team can actually execute.
            </p>
            <div className="actions">
              <a className="cta" href="#demo">
                Request demo
              </a>
              <a className="secondary" href="#product">
                See how it works
              </a>
            </div>
          </div>

          <div className="product-frame" aria-label="SEO backlog preview">
            {rows.map(([title, issue, score]) => (
              <div className="mock-row" key={title}>
                <div>
                  <strong>{title}</strong>
                  <span>{issue}</span>
                </div>
                <span className="score">Impact {score}</span>
                <span className="score">Open</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="product">
          <h2>Replace scattered SEO checks with one operations workflow.</h2>
          <p>
            The product connects site data, search performance, audit evidence, assignments, and
            safe fixes so agencies and content teams can manage SEO work across many WordPress
            properties.
          </p>
        </section>

        <section className="section" id="features">
          <h2>Built for SEO teams that need control.</h2>
          <p>
            The first MVP focuses on tenant isolation, auditability, and human-approved operations
            before any AI-assisted workflow is introduced.
          </p>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
