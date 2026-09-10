"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { checkPageAction } from "../app/tools/page-checker/actions";
import type { PageCheckerActionState } from "../lib/page-checker";

const initialState: PageCheckerActionState = { status: "idle", message: "" };

const severityLabel: Record<string, string> = {
  critical: "Fix",
  warning: "Review",
  good: "Good",
  info: "Note"
};

export function PageCheckerForm() {
  const [state, action, pending] = useActionState(checkPageAction, initialState);

  return (
    <div>
      <form className="checker-form" action={action} noValidate>
        <div className="field">
          <label>
            <span>URL to check</span>
            <input
              id="url"
              name="url"
              type="text"
              inputMode="url"
              placeholder="https://example.com/blog/post"
              autoComplete="off"
              required
            />
          </label>
        </div>
        <button className="button form-submit" disabled={pending} type="submit">
          {pending ? (
            <>
              <LoaderCircle className="spin" size={17} /> Checking
            </>
          ) : (
            <>
              Check page <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      {state.status === "error" ? (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" && state.result ? (
        <div className="checker-panel" role="status">
          <div className="checker-summary">
            <strong>{state.result.requestedUrl}</strong>
            <span className={`finding-badge ${state.result.httpStatus < 400 ? "good" : "critical"}`}>
              HTTP {state.result.httpStatus}
            </span>
            {state.result.redirected ? (
              <span className="redirect-note">Redirected to {state.result.finalUrl}</span>
            ) : null}
          </div>

          <div className="finding-list">
            {state.result.findings.map((finding) => (
              <div className="finding" key={finding.id}>
                <span className={`finding-badge ${finding.severity}`}>
                  {severityLabel[finding.severity]}
                </span>
                <div>
                  <h3>{finding.label}</h3>
                  <p>{finding.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="checker-disclosure">
            This checks one page from one fetch — a quick read, not the plugin&rsquo;s full audit.
            The Content Signal WordPress plugin scans every published post and page in bounded
            background batches and keeps a history of what changed.
          </p>
        </div>
      ) : null}
    </div>
  );
}
