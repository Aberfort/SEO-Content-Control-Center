"use client";

import { useActionState, useId, useState } from "react";

import { createPluginConnectionChallengeAction, type ActionState } from "@/app/actions";

type PluginChallengeFormProps = {
  organizationId: string;
  siteId: string;
};

type CopyFieldProps = {
  label: string;
  value: string;
};

const initialState: ActionState = {
  ok: true,
  message: ""
};

export function PluginChallengeForm({ organizationId, siteId }: PluginChallengeFormProps) {
  const [state, formAction, isPending] = useActionState(
    createPluginConnectionChallengeAction,
    initialState
  );
  const setup = state.pluginConnectionChallenge;

  return (
    <div className="plugin-challenge-form">
      <form action={formAction}>
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="siteId" type="hidden" value={siteId} />
        <button className="secondary-button" type="submit" disabled={isPending}>
          {isPending ? "Generating..." : setup ? "Rotate challenge" : "Generate challenge"}
        </button>
      </form>
      {state.message ? (
        <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>
      ) : null}
      {setup ? (
        <div className="plugin-challenge-details" aria-live="polite">
          <CopyField label="SaaS endpoint" value={setup.endpoint} />
          <CopyField label="Connection challenge" value={setup.challenge} />
          <p className="plugin-challenge-meta">Expires {formatLocalDateTime(setup.expiresAt)}.</p>
        </div>
      ) : null}
    </div>
  );
}

function CopyField({ label, value }: CopyFieldProps) {
  const inputId = useId();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <label className="copy-field-label" htmlFor={inputId}>
      <span>{label}</span>
      <span className="copy-field">
        <input
          id={inputId}
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button className="secondary-button" type="button" onClick={copyValue}>
          {formatCopyButtonLabel(copyState)}
        </button>
      </span>
    </label>
  );
}

function formatCopyButtonLabel(copyState: "idle" | "copied" | "failed"): string {
  if (copyState === "copied") {
    return "Copied";
  }

  if (copyState === "failed") {
    return "Failed";
  }

  return "Copy";
}

function formatLocalDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
