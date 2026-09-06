"use client";

import { useActionState } from "react";
import { grantablePlanCodes } from "@sccc/shared";

import { createPlanGrantAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {
  ok: true,
  message: ""
};

const planLabels: Record<(typeof grantablePlanCodes)[number], string> = {
  STARTER: "Starter",
  PRO: "Pro",
  AGENCY: "Agency"
};

export function CreatePlanGrantForm() {
  const [state, formAction, isPending] = useActionState(createPlanGrantAction, initialState);

  return (
    <form className="inline-form" action={formAction}>
      <label>
        <span>Plan</span>
        <select name="planCode" defaultValue="STARTER">
          {grantablePlanCodes.map((code) => (
            <option key={code} value={code}>
              {planLabels[code]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Recipient email (optional)</span>
        <input name="recipientEmail" type="email" placeholder="them@example.com" />
      </label>
      <label>
        <span>Note (optional)</span>
        <input name="note" type="text" maxLength={280} placeholder="Why this code exists" />
      </label>
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create code"}
      </button>
      {!state.ok ? <p className="form-error">{state.message}</p> : null}
    </form>
  );
}
