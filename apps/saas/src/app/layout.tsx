import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Content Control Center",
  description: "A WordPress SEO operations hub for audits, backlog, teams, and safe fixes."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
