"use client";

import { useActionState } from "react";

import { updateMemberRoleAction, type ActionState } from "@/app/actions";
import type { OrganizationMemberSummary } from "@/lib/types";

type MemberRoleFormProps = {
  organizationId: string;
  member: OrganizationMemberSummary;
  currentUserId: string;
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

export function MemberRoleForm({ organizationId, member, currentUserId }: MemberRoleFormProps) {
  const [state, formAction, isPending] = useActionState(updateMemberRoleAction, initialState);
  const disabled = member.role === "OWNER" || member.userId === currentUserId;

  if (disabled) {
    return <span className="muted-text">{member.role.replaceAll("_", " ").toLowerCase()}</span>;
  }

  return (
    <form className="role-form" action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="memberId" type="hidden" value={member.id} />
      <select name="role" defaultValue={member.role} aria-label={`Role for ${member.email}`}>
        {roles.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button className="secondary-button" type="submit" disabled={isPending}>
        Save
      </button>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
    </form>
  );
}
