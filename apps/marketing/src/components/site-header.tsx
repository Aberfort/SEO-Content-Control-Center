import {
  ArrowRight,
  BookOpenText,
  Building2,
  FileText,
  Layers3,
  Menu,
  PlugZap,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import Link from "next/link";

import { appUrl } from "../lib/site";

const quickNavigation = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" }
];

const mobileNavigation = [
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
  { href: "/contact", label: "Contact" }
];

const megaSections = [
  {
    title: "Platform",
    links: [
      {
        href: "/product",
        label: "Product overview",
        description: "Inventory, evidence, backlog, and approvals.",
        icon: Layers3
      },
      {
        href: "/features",
        label: "Features",
        description: "Prioritization, review, execution, and history.",
        icon: Sparkles
      },
      {
        href: "/integrations",
        label: "Integrations",
        description: "WordPress and Search Console in one workflow.",
        icon: PlugZap
      }
    ]
  },
  {
    title: "Solutions",
    links: [
      {
        href: "/solutions/agencies",
        label: "Agencies",
        description: "Manage client SEO queues with clear ownership.",
        icon: Building2
      },
      {
        href: "/solutions/content-teams",
        label: "Content teams",
        description: "Give editors the next page that matters.",
        icon: UsersRound
      },
      {
        href: "/solutions/publishers",
        label: "Publishers",
        description: "Prioritize large WordPress inventories.",
        icon: FileText
      }
    ]
  },
  {
    title: "Resources",
    links: [
      {
        href: "/knowledge-base",
        label: "Knowledge base",
        description: "Guides for setup, review, and operations.",
        icon: BookOpenText
      },
      {
        href: "/security",
        label: "Security",
        description: "Review-first execution and tenant boundaries.",
        icon: ShieldCheck
      },
      {
        href: "/changelog",
        label: "Changelog",
        description: "Follow product updates and release notes.",
        icon: ArrowRight
      }
    ]
  }
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
          <span className="brand-text">
            <span>SEO Content</span>
            <span>Control Center</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Quick navigation">
          {quickNavigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <details className="desktop-mega-menu">
            <summary aria-label="Open site menu">
              <span className="menu-glyph" aria-hidden="true">
                <span />
                <span />
              </span>
              <span>Menu</span>
            </summary>
            <div className="mega-panel">
              <div className="mega-panel-header">
                <span>SEO operations map</span>
                <strong>Move from evidence to approved WordPress work.</strong>
              </div>
              <div className="mega-grid">
                {megaSections.map((section) => (
                  <div className="mega-section" key={section.title}>
                    <span className="mega-section-title">{section.title}</span>
                    <div className="mega-link-list">
                      {section.links.map((item) => {
                        const Icon = item.icon;

                        return (
                          <Link className="mega-link" href={item.href} key={item.href}>
                            <span className="mega-link-icon" aria-hidden="true">
                              <Icon size={17} />
                            </span>
                            <span>
                              <strong>{item.label}</strong>
                              <small>{item.description}</small>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mega-panel-footer">
                <Link href="/demo">See workflow</Link>
                <Link href="/trial">
                  Start trial
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </details>
          <a className="text-action" href={loginUrl}>
            Log in
          </a>
          <Link className="button button-small button-dark" href="/trial">
            Start trial
            <ArrowRight size={16} />
          </Link>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Open navigation">
            <Menu size={21} />
          </summary>
          <nav aria-label="Mobile navigation">
            <span className="mobile-menu-title">Navigation</span>
            {megaSections.map((section) => (
              <div className="mobile-menu-section" key={section.title}>
                <span>{section.title}</span>
                {section.links.map((item) => (
                  <Link href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mobile-menu-section mobile-menu-shortcuts">
              <span>Shortcuts</span>
              {mobileNavigation.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <a href={loginUrl}>Log in</a>
            <Link className="button button-dark" href="/trial">
              Start trial
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
