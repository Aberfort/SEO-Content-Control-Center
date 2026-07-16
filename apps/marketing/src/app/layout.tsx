import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
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
    default: "SEO Content Control Center for WordPress",
    template: `%s | ${siteName}`
  },
  description:
    "Find WordPress pages losing organic traffic and turn them into a prioritized SEO backlog.",
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
    title: "SEO Content Control Center for WordPress",
    description:
      "Connect WordPress and Google Search Console to prioritize SEO fixes and prove impact.",
    siteName,
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "SEO Content Control Center for WordPress",
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
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
