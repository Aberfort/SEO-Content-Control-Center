import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Content Control Center for WordPress",
  description:
    "Find WordPress pages losing organic traffic and turn them into a prioritized SEO backlog.",
  openGraph: {
    title: "SEO Content Control Center for WordPress",
    description:
      "Connect WordPress and Google Search Console to prioritize SEO fixes and prove impact."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
