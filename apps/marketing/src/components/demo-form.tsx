"use client";

import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { submitDemoLeadAction } from "../app/actions";
import { demoTopics, type DemoLeadActionState } from "../lib/demo-lead";

const initialState: DemoLeadActionState = {
  status: "idle",
  message: ""
};

type DemoFormProps = {
  defaultTopic?: string;
};

export function DemoForm({ defaultTopic }: DemoFormProps) {
  const [state, action, pending] = useActionState(submitDemoLeadAction, initialState);
  const selectedTopic = demoTopics.includes(defaultTopic as (typeof demoTopics)[number])
    ? defaultTopic
    : "Product demo";

  if (state.status === "success") {
    return (
      <div className="form-success" role="status">
        <CheckCircle2 size={28} />
        <h2>Request received.</h2>
        <p>{state.message}</p>
        <span>We will use the work email you submitted for scheduling.</span>
      </div>
    );
  }

  return (
    <form className="lead-form" action={action} noValidate>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="companyFax">Company fax</label>
        <input id="companyFax" name="companyFax" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-grid">
        <Field label="Name" error={state.fieldErrors?.name}>
          <input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Work email" error={state.fieldErrors?.workEmail}>
          <input id="workEmail" name="workEmail" type="email" autoComplete="email" required />
        </Field>
        <Field label="Company or team" error={state.fieldErrors?.company}>
          <input id="company" name="company" autoComplete="organization" required />
        </Field>
        <Field label="WordPress website" hint="Optional" error={state.fieldErrors?.website}>
          <input id="website" name="website" type="url" placeholder="https://example.com" />
        </Field>
        <Field label="Your role" error={state.fieldErrors?.role}>
          <select id="role" name="role" defaultValue="" required>
            <option value="" disabled>
              Select role
            </option>
            <option>SEO lead</option>
            <option>Agency owner</option>
            <option>Content or editorial lead</option>
            <option>WordPress lead</option>
            <option>Product or operations lead</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="WordPress sites" error={state.fieldErrors?.siteCount}>
          <select id="siteCount" name="siteCount" defaultValue="" required>
            <option value="" disabled>
              Select portfolio size
            </option>
            <option>1</option>
            <option>2-5</option>
            <option>6-20</option>
            <option>21-50</option>
            <option>51+</option>
          </select>
        </Field>
      </div>

      <Field label="What should we focus on?" error={state.fieldErrors?.topic}>
        <select id="topic" name="topic" defaultValue={selectedTopic} required>
          {demoTopics.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
      </Field>

      <Field
        label="What is getting in the way today?"
        hint="Optional"
        error={state.fieldErrors?.notes}
      >
        <textarea id="notes" name="notes" rows={5} maxLength={1200} />
      </Field>

      <label className="consent-field">
        <input name="consent" type="checkbox" required />
        <span>
          I agree that SEO Content Control Center may contact me about this request. See the{" "}
          <a href="/privacy">privacy policy</a>.
        </span>
      </label>
      {state.fieldErrors?.consent ? (
        <span className="field-error">{state.fieldErrors.consent}</span>
      ) : null}

      {state.status === "error" ? (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="button form-submit" disabled={pending} type="submit">
        {pending ? (
          <>
            <LoaderCircle className="spin" size={17} /> Sending request
          </>
        ) : (
          <>
            Request my demo <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>
        <span>
          {label} {hint ? <small>{hint}</small> : null}
        </span>
        {children}
      </label>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
