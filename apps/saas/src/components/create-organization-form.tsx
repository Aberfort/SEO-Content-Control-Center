"use client";

import { useActionState } from "react";

import { createOrganizationAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function CreateOrganizationForm() {
  const [state, formAction, isPending] = useActionState(createOrganizationAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <label>
        <span>Organization name</span>
        <input name="name" type="text" minLength={2} maxLength={120} required />
      </label>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}
