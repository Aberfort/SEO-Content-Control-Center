import Link from "next/link";

import { verifyEmailToken } from "@/lib/email-verification";

export const dynamic = "force-dynamic";

type VerifyEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = readToken(params);
  const result = token ? await verifyToken(token) : null;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          SEO Content Control Center
        </Link>
        <h1>{result?.ok ? "Email verified." : "Email verification failed."}</h1>
        <p>{result?.message ?? "The verification link is missing a token."}</p>
        <Link className="button" href={result?.ok ? "/" : "/auth/login"}>
          {result?.ok ? "Go to workspace" : "Back to sign in"}
        </Link>
      </section>
    </main>
  );
}

async function verifyToken(token: string): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await verifyEmailToken({ token });

    if (result.status === "already_verified") {
      return {
        ok: true,
        message: `${result.email} was already verified.`
      };
    }

    return {
      ok: true,
      message: `${result.email} is now verified.`
    };
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_VERIFICATION_TOKEN_EXPIRED") {
      return {
        ok: false,
        message: "This verification link has expired. Sign in and request a fresh link."
      };
    }

    if (error instanceof Error && error.message === "EMAIL_VERIFICATION_TOKEN_USED") {
      return {
        ok: false,
        message: "This verification link was already used. Sign in to continue."
      };
    }

    return {
      ok: false,
      message: "This verification link is invalid."
    };
  }
}

function readToken(params: Record<string, string | string[] | undefined> | undefined): string {
  const token = params?.token;
  return Array.isArray(token) ? (token[0] ?? "") : (token ?? "");
}
