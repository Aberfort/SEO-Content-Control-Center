"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, registerAction, type ActionState } from "@/app/actions";

type AuthFormProps = {
  mode: "login" | "register";
  redirectTo?: string;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isLogin = mode === "login";

  return (
    <form className="auth-form" action={formAction}>
      {redirectTo ? <input name="redirectTo" type="hidden" value={redirectTo} /> : null}
      {!isLogin ? (
        <label>
          <span>Name</span>
          <input name="name" type="text" minLength={2} maxLength={120} required />
        </label>
      ) : null}
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          minLength={isLogin ? 1 : 10}
          maxLength={128}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
      </label>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Working..." : isLogin ? "Sign in" : "Create account"}
      </button>
      <p className="auth-switch">
        {isLogin ? "No account yet?" : "Already have an account?"}{" "}
        <Link href={authSwitchHref(isLogin, redirectTo)}>{isLogin ? "Create one" : "Sign in"}</Link>
      </p>
    </form>
  );
}

function authSwitchHref(isLogin: boolean, redirectTo: string | undefined): string {
  const path = isLogin ? "/auth/register" : "/auth/login";

  if (!redirectTo) {
    return path;
  }

  const params = new URLSearchParams({ next: redirectTo });
  return `${path}?${params.toString()}`;
}
