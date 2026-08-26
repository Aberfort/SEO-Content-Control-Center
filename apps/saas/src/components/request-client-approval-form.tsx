"use client";

import { useActionState } from "react";

import { requestClientApprovalAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {
  ok: true,
  message: ""
};

type RequestClientApprovalFormProps = {
  organizationId: string;
  siteId: string;
  operationId: string;
  redirectTo: string;
};

export function RequestClientApprovalForm({
  organizationId,
  siteId,
  operationId,
  redirectTo
}: RequestClientApprovalFormProps) {
  const [state, formAction, isPending] = useActionState(requestClientApprovalAction, initialState);

  return (
    <form className="client-approval-form" action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="siteId" type="hidden" value={siteId} />
      <input name="operationId" type="hidden" value={operationId} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <input
        aria-label="Client email"
        name="approverEmail"
        placeholder="client@example.com"
        required
        type="email"
      />
      <button className="secondary-button" disabled={isPending} type="submit">
        {isPending ? "Sending..." : "Request client approval"}
      </button>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
    </form>
  );
}
