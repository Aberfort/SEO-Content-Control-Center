"use client";

import { useActionState } from "react";

import { respondToClientApprovalAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {
  ok: true,
  message: ""
};

type OperationApprovalResponseFormProps = {
  token: string;
};

export function OperationApprovalResponseForm({ token }: OperationApprovalResponseFormProps) {
  const [state, formAction, isPending] = useActionState(respondToClientApprovalAction, initialState);

  return (
    <form className="approval-response-form" action={formAction}>
      <input name="token" type="hidden" value={token} />
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
      <div className="approval-response-actions">
        <button className="button" disabled={isPending} name="decision" type="submit" value="APPROVED">
          {isPending ? "Submitting..." : "Approve"}
        </button>
        <button
          className="secondary-button"
          disabled={isPending}
          name="decision"
          type="submit"
          value="DECLINED"
        >
          Decline
        </button>
      </div>
    </form>
  );
}
