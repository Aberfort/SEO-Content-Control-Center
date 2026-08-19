import Link from "next/link";

import { appUrl } from "../lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
                <rect x="5.6" y="11" width="2.3" height="4.5" rx="0.6" fill="currentColor" />
                <rect x="9.1" y="7.8" width="2.3" height="7.7" rx="0.6" fill="currentColor" />
                <rect x="12.6" y="4.5" width="2.3" height="11" rx="0.6" fill="currentColor" />
              </svg>
            </span>
            <span className="brand-text">
              <span>Content</span>
              <span>Signal</span>
            </span>
          </Link>
          <p>Evidence, backlog, review, and safe WordPress execution in one calm workflow.</p>
        </div>

        <div className="footer-links">
          <div>
            <strong>Product</strong>
            <Link href="/features">Features</Link>
            <Link href="/product">Product overview</Link>
            <Link href="/integrations">Integrations</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/security">Security</Link>
          </div>
          <div>
            <strong>Solutions</strong>
            <Link href="/solutions/agencies">Agencies</Link>
            <Link href="/solutions/content-teams">Content teams</Link>
            <Link href="/solutions/publishers">Publishers</Link>
          </div>
          <div>
            <strong>Resources</strong>
            <Link href="/knowledge-base">Knowledge base</Link>
            <Link href="/blog">SEO briefings</Link>
            <Link href="/changelog">Changelog</Link>
          </div>
          <div>
            <strong>Company</strong>
            <Link href="/contact">Contact</Link>
            <Link href="/status">Service information</Link>
            <Link href="/demo">Request a demo</Link>
            <Link href="/trial">Start a trial</Link>
            <a href={appUrl("/auth/login")}>Log in</a>
          </div>
          <div>
            <strong>Legal</strong>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
      <div className="footer-meta">
        <span>&copy; {new Date().getFullYear()} Content Signal</span>
        <span>Built for review-first SEO operations.</span>
      </div>
    </footer>
  );
}
