"use client";

import { useActionState } from "react";

import { redeemPlanGrantCodeAction, type ActionState } from "@/app/actions";

type RedeemPlanGrantFormProps = {
  organizationId: string;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function RedeemPlanGrantForm({ organizationId }: RedeemPlanGrantFormProps) {
  const [state, formAction, isPending] = useActionState(redeemPlanGrantCodeAction, initialState);

  return (
    <form className="inline-form redeem-plan-grant-form" action={formAction}>
      <input name="organizationId" type="hidden" value={organizationId} />
      <label>
        <span>Have a plan code?</span>
        <input name="code" placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" required />
      </label>
      <button className="secondary-button" type="submit" disabled={isPending}>
        {isPending ? "Checking..." : "Redeem"}
      </button>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
    </form>
  );
}
