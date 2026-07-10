import { ArrowRight, LogIn, Menu, ScanSearch } from "lucide-react";
import Link from "next/link";

import { appUrl } from "../lib/site";

const navigation = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" }
];

export function SiteHeader() {
  const loginUrl = appUrl("/auth/login");

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="SEO Content Control Center home">
          <span className="brand-mark" aria-hidden="true">
            <ScanSearch size={21} strokeWidth={2.2} />
          </span>
          <span>SEO Content Control Center</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <a className="text-action" href={loginUrl}>
            <LogIn size={16} />
            Log in
          </a>
          <Link className="button button-small" href="/trial">
            Start free trial
            <ArrowRight size={16} />
          </Link>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Open navigation">
            <Menu size={21} />
          </summary>
          <nav aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <a href={loginUrl}>Log in</a>
            <Link className="button" href="/trial">
              Start free trial
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
