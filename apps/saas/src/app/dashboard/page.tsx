export default function DashboardPage() {
  return (
    <main className="main">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your SEO operation starts after connecting a site.</h1>
        </div>
      </div>
      <section className="panel empty-state">
        <h2>Nothing to audit yet</h2>
        <p>
          Connect a WordPress site and Google Search Console property to see traffic loss signals,
          SEO issues, and backlog tasks.
        </p>
      </section>
    </main>
  );
}
