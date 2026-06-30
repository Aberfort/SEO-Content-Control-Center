"use client";

import { useActionState } from "react";

import { inviteMemberAction, type ActionState } from "@/app/actions";

type InviteMemberFormProps = {
  organizationId: string;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

const roles = [
  ["ADMIN", "Admin"],
  ["SEO_MANAGER", "SEO Manager"],
  ["EDITOR", "Editor"],
  ["WRITER", "Writer"],
  ["VIEWER", "Viewer"],
  ["BILLING_MANAGER", "Billing Manager"]
] as const;

export function InviteMemberForm({ organizationId }: InviteMemberFormProps) {
  const [state, formAction, isPending] = useActionState(inviteMemberAction, initialState);

  return (
    <form className="inline-form" action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <label>
        <span>Email</span>
        <input name="email" type="email" required />
      </label>
      <label>
        <span>Role</span>
        <select name="role" defaultValue="VIEWER">
          {roles.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Inviting..." : "Invite"}
      </button>
    </form>
  );
}
