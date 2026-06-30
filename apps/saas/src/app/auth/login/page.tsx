import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

type AuthPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const redirectTo = readRedirectTo(params);
  const user = await getCurrentUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          SEO Content Control Center
        </Link>
        <h1>Sign in to your workspace.</h1>
        <p>Use your account to manage organizations, sites, audits, and backlog work.</p>
        <AuthForm mode="login" redirectTo={redirectTo} />
      </section>
    </main>
  );
}

function readRedirectTo(params: Record<string, string | string[] | undefined> | undefined): string {
  const next = params?.next;
  const value = Array.isArray(next) ? next[0] : next;

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
