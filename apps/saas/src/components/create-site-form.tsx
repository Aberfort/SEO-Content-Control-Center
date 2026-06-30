"use client";

import { useActionState } from "react";

import { createSiteAction, type ActionState } from "@/app/actions";

type CreateSiteFormProps = {
  organizationId: string;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function CreateSiteForm({ organizationId }: CreateSiteFormProps) {
  const [state, formAction, isPending] = useActionState(createSiteAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <label>
        <span>Site name</span>
        <input name="name" type="text" minLength={2} maxLength={120} required />
      </label>
      <label>
        <span>WordPress URL</span>
        <input name="url" type="url" placeholder="https://example.com" required />
      </label>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add site"}
      </button>
    </form>
  );
}
