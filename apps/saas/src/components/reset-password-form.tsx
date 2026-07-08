"use client";

import Link from "next/link";
import { useActionState } from "react";

import { confirmPasswordResetAction, type ActionState } from "@/app/actions";

type ResetPasswordFormProps = {
  token: string;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(confirmPasswordResetAction, initialState);
  const passwordWasReset = state.ok && Boolean(state.message);

  return (
    <form className="auth-form" action={formAction}>
      <input name="token" type="hidden" value={token} />
      <label>
        <span>New password</span>
        <input
          name="password"
          type="password"
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      {state.message ? (
        <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>
      ) : null}
      <button className="button" type="submit" disabled={isPending || passwordWasReset}>
        {isPending ? "Resetting..." : "Reset password"}
      </button>
      <p className="auth-switch">
        Ready? <Link href="/auth/login">Sign in</Link>
      </p>
    </form>
  );
}
