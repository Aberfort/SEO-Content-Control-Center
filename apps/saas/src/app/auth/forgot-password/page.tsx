import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { siteName } from "@/lib/brand";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          {siteName}
        </Link>
        <h1>Reset your password.</h1>
        <p>Enter your account email and we will send a one-time reset link.</p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
