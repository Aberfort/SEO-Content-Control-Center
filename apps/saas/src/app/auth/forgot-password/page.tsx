import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" href="/">
          SEO Content Control Center
        </Link>
        <h1>Reset your password.</h1>
        <p>Enter your account email and we will send a one-time reset link.</p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
