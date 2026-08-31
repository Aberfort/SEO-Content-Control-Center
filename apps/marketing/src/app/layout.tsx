import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { StructuredData } from "../components/structured-data";
import { organizationSchema, websiteSchema } from "../lib/schema";
import { marketingOrigin, siteName } from "../lib/site";

import "./globals.css";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sans"
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL(marketingOrigin),
  title: {
    default: "WordPress SEO Audit & Content Operations | Content Signal",
    template: `%s | ${siteName}`
  },
  description:
    "Audit WordPress content for noindex risk, missing metadata, thin content, and orphan pages, then turn the findings into a prioritized SEO backlog.",
  applicationName: siteName,
  keywords: [
    "WordPress SEO",
    "SEO audit workflow",
    "Google Search Console",
    "SEO operations",
    "content optimization"
  ],
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: "/icon.svg"
  },
  openGraph: {
    type: "website",
    title: "WordPress SEO Audit & Content Operations",
    description:
      "Connect WordPress and Google Search Console to prioritize SEO fixes and prove impact.",
    siteName,
    locale: "en_US",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "WordPress SEO Audit & Content Operations",
    description:
      "Connect WordPress and Google Search Console to prioritize SEO fixes and prove impact."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
      lang="en"
    >
      <body>
        <StructuredData id="site-schema" data={[organizationSchema(), websiteSchema()]} />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
