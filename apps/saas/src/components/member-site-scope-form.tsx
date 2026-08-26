"use client";

import { useActionState, useState } from "react";

import { updateMemberSiteScopeAction, type ActionState } from "@/app/actions";
import { SiteScopeFields } from "@/components/site-scope-fields";
import type { OrganizationMemberSummary, Site } from "@/lib/types";

type MemberSiteScopeFormProps = {
  organizationId: string;
  member: OrganizationMemberSummary;
  sites: Site[];
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function MemberSiteScopeForm({ organizationId, member, sites }: MemberSiteScopeFormProps) {
  const [state, formAction, isPending] = useActionState(updateMemberSiteScopeAction, initialState);
  const [editing, setEditing] = useState(false);

  if (member.role === "OWNER" || sites.length === 0) {
    return <span className="muted-text">all sites</span>;
  }

  const summary =
    member.siteScope.length === 0
      ? "All sites"
      : `${member.siteScope.length} of ${sites.length} sites`;

  if (!editing) {
    return (
      <button className="link-button" onClick={() => setEditing(true)} type="button">
        {summary}
      </button>
    );
  }

  return (
    <form className="member-site-scope-form" action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="memberId" type="hidden" value={member.id} />
      <SiteScopeFields defaultSiteIds={member.siteScope} label="" sites={sites} />
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <div className="member-site-scope-actions">
        <button className="secondary-button" disabled={isPending} type="submit">
          Save
        </button>
        <button className="link-button" onClick={() => setEditing(false)} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}
