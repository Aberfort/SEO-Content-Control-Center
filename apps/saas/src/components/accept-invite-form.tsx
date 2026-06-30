"use client";

import { useActionState } from "react";

import { acceptInviteAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {
  ok: true,
  message: ""
};

type AcceptInviteFormProps = {
  token: string;
};

export function AcceptInviteForm({ token }: AcceptInviteFormProps) {
  const [state, formAction, isPending] = useActionState(acceptInviteAction, initialState);

  return (
    <form className="auth-form" action={formAction}>
      <input name="token" type="hidden" value={token} />
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Accepting..." : "Accept invite"}
      </button>
    </form>
  );
}
