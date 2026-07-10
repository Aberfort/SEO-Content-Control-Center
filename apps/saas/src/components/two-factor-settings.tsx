"use client";

import { useActionState } from "react";

import {
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
  startTwoFactorSetupAction,
  type ActionState
} from "@/app/actions";
import type { TwoFactorStatus } from "@/lib/two-factor";

type TwoFactorSettingsProps = {
  status: TwoFactorStatus;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function TwoFactorSettings({ status }: TwoFactorSettingsProps) {
  const [setupState, startSetupAction, setupPending] = useActionState(
    startTwoFactorSetupAction,
    initialState
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmTwoFactorSetupAction,
    initialState
  );
  const [disableState, disableAction, disablePending] = useActionState(
    disableTwoFactorAction,
    initialState
  );
  const setup = setupState.twoFactorSetup;

  if (status.enabled) {
    return (
      <div className="two-factor-settings">
        <div>
          <strong>Authenticator app</strong>
          <span>Enabled{status.enabledAt ? ` on ${status.enabledAt.slice(0, 10)}` : ""}</span>
        </div>
        <form className="inline-form" action={disableAction}>
          <input
            aria-label="Authenticator code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            name="twoFactorCode"
            pattern="[0-9]{6}"
            placeholder="123456"
            required
            type="text"
          />
          <button className="secondary-button" disabled={disablePending} type="submit">
            {disablePending ? "Disabling..." : "Disable"}
          </button>
        </form>
        {disableState.message ? (
          <p className={disableState.ok ? "form-success" : "form-error"}>{disableState.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="two-factor-settings">
      <div>
        <strong>Authenticator app</strong>
        <span>{status.pending ? "Setup pending" : "Not enabled"}</span>
      </div>
      <form action={startSetupAction}>
        <button className="secondary-button" disabled={setupPending} type="submit">
          {setupPending ? "Starting..." : status.pending ? "Restart setup" : "Start setup"}
        </button>
      </form>
      {setupState.message ? (
        <p className={setupState.ok ? "form-success" : "form-error"}>{setupState.message}</p>
      ) : null}
      {setup ? (
        <div className="two-factor-secret">
          <label>
            <span>Manual key</span>
            <input readOnly value={setup.secret} />
          </label>
          <label>
            <span>Provisioning URI</span>
            <textarea readOnly rows={3} value={setup.otpauthUrl} />
          </label>
        </div>
      ) : null}
      {setup || status.pending ? (
        <form className="inline-form" action={confirmAction}>
          <input
            aria-label="Authenticator code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            name="twoFactorCode"
            pattern="[0-9]{6}"
            placeholder="123456"
            required
            type="text"
          />
          <button className="secondary-button" disabled={confirmPending} type="submit">
            {confirmPending ? "Verifying..." : "Verify"}
          </button>
        </form>
      ) : null}
      {confirmState.message ? (
        <p className={confirmState.ok ? "form-success" : "form-error"}>{confirmState.message}</p>
      ) : null}
    </div>
  );
}
