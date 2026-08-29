"use client";

import { useActionState } from "react";

import { createMonitoredUrlAction, type ActionState } from "@/app/actions";

type CreateMonitoredUrlFormProps = {
  organizationId: string;
  siteId: string;
  redirectTo: string;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function CreateMonitoredUrlForm({
  organizationId,
  siteId,
  redirectTo
}: CreateMonitoredUrlFormProps) {
  const [state, formAction, isPending] = useActionState(createMonitoredUrlAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="siteId" type="hidden" value={siteId} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <label>
        <span>URL to monitor</span>
        <input
          name="url"
          type="url"
          placeholder="https://example.com/important-page/"
          maxLength={2048}
          required
        />
      </label>
      <label>
        <span>Label (optional)</span>
        <input name="label" type="text" maxLength={160} placeholder="Best casinos landing page" />
      </label>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add monitored URL"}
      </button>
    </form>
  );
}
