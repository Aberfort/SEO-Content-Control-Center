import Link from "next/link";

import { ResetPasswordForm } from "@/components/reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = readToken(params);

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          SEO Content Control Center
        </Link>
        <h1>Choose a new password.</h1>
        {token ? (
          <>
            <p>Use at least 10 characters. This reset link can only be used once.</p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <>
            <p>This password reset link is missing a token.</p>
            <Link className="button" href="/auth/forgot-password">
              Request a fresh link
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

function readToken(params: Record<string, string | string[] | undefined> | undefined): string {
  const token = params?.token;
  return Array.isArray(token) ? (token[0] ?? "") : (token ?? "");
}
