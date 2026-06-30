import Link from "next/link";

import { AcceptInviteForm } from "@/components/accept-invite-form";
import { getCurrentUser } from "@/lib/auth";

type AcceptInvitePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const params = await searchParams;
  const token = readToken(params);
  const user = await getCurrentUser();
  const redirectTo = token ? `/auth/accept-invite?token=${encodeURIComponent(token)}` : "/";
  const authParams = new URLSearchParams({ next: redirectTo });

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          SEO Content Control Center
        </Link>
        <h1>Accept workspace invite.</h1>
        <p>Use the invited email address to join the organization.</p>
        {!token ? (
          <p className="form-error">Invite token is missing.</p>
        ) : user ? (
          <>
            <p className="empty-copy">Signed in as {user.email}.</p>
            <AcceptInviteForm token={token} />
          </>
        ) : (
          <div className="invite-auth-actions">
            <Link className="button" href={`/auth/login?${authParams.toString()}`}>
              Sign in
            </Link>
            <Link
              className="button button-secondary"
              href={`/auth/register?${authParams.toString()}`}
            >
              Create account
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function readToken(params: Record<string, string | string[] | undefined> | undefined): string {
  const token = params?.token;
  return Array.isArray(token) ? (token[0] ?? "") : (token ?? "");
}
