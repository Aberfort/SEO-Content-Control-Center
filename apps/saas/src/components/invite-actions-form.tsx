"use client";

import { useActionState } from "react";

import { cancelInviteAction, resendInviteAction, type ActionState } from "@/app/actions";
import type { OrganizationMemberSummary } from "@/lib/types";

const initialState: ActionState = {
  ok: true,
  message: ""
};

type InviteActionsFormProps = {
  organizationId: string;
  member: OrganizationMemberSummary;
};

export function InviteActionsForm({ organizationId, member }: InviteActionsFormProps) {
  const [resendState, resendAction, isResending] = useActionState(resendInviteAction, initialState);
  const [cancelState, cancelAction, isCanceling] = useActionState(cancelInviteAction, initialState);
  const errorMessage = !resendState.ok
    ? resendState.message
    : !cancelState.ok
      ? cancelState.message
      : "";

  if (member.status !== "INVITED") {
    return null;
  }

  return (
    <div className="invite-actions">
      <form action={resendAction}>
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="memberId" type="hidden" value={member.id} />
        <button className="secondary-button" type="submit" disabled={isResending || isCanceling}>
          {isResending ? "Resending..." : "Resend"}
        </button>
      </form>
      <form action={cancelAction}>
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="memberId" type="hidden" value={member.id} />
        <button
          className="text-button danger-button"
          type="submit"
          disabled={isResending || isCanceling}
        >
          {isCanceling ? "Canceling..." : "Cancel"}
        </button>
      </form>
      {errorMessage ? <p className="form-error compact-error">{errorMessage}</p> : null}
    </div>
  );
}
