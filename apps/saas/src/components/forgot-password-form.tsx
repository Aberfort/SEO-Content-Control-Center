"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form className="auth-form" action={formAction}>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      {state.message ? (
        <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>
      ) : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </button>
      <p className="auth-switch">
        Remembered it? <Link href="/auth/login">Sign in</Link>
      </p>
    </form>
  );
}
