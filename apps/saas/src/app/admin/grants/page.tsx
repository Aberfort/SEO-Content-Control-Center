import { redirect } from "next/navigation";
import { formatPlanGrantCodeForDisplay, getPlanGrantCodeStatus } from "@sccc/shared";

import { revokePlanGrantAction } from "@/app/actions";
import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { CreatePlanGrantForm } from "@/components/create-plan-grant-form";

/**
 * Owner-only: issue a code that activates a paid plan on an organization
 * with no Stripe subscription behind it (comps, partner accounts, press).
 * Gated by SCCC_PLATFORM_ADMIN_EMAILS -- being an OWNER/ADMIN of an
 * organization grants no access here.
 */
type PlanGrantsAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlanGrantsAdminPage({ searchParams }: PlanGrantsAdminPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=%2Fadmin%2Fgrants");
  }

  if (!isPlatformAdmin(user.email)) {
    redirect("/");
  }

  const params = (await searchParams) ?? {};
  const errorParam = params.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const grants = await getAppRepository().listPlanGrantCodes();

  return (
    <main className="admin-grants-page">
      <header className="section-heading">
        <span className="eyebrow">Owner tools</span>
        <h1>Plan grant codes</h1>
        <p>
          Create a code that activates a plan on whichever organization redeems it, no payment
          required. Send it directly, or copy it from here once created.
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="panel">
        <h2>New code</h2>
        <CreatePlanGrantForm />
      </section>

      <section className="panel">
        <h2>Issued codes</h2>
        {grants.length === 0 ? (
          <p>No codes yet.</p>
        ) : (
          <table className="admin-grants-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Plan</th>
                <th>Recipient</th>
                <th>Note</th>
                <th>Status</th>
                <th>Created</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {grants.map((grant) => {
                const status = getPlanGrantCodeStatus(grant);

                return (
                  <tr key={grant.id}>
                    <td>
                      <code>{formatPlanGrantCodeForDisplay(grant.code)}</code>
                    </td>
                    <td>{grant.planCode}</td>
                    <td>{grant.recipientEmail ?? "—"}</td>
                    <td>{grant.note ?? "—"}</td>
                    <td>
                      <span className={`plan-grant-status plan-grant-status-${status}`}>
                        {status}
                      </span>
                    </td>
                    <td>{new Date(grant.createdAt).toLocaleDateString()}</td>
                    <td>
                      {status === "active" ? (
                        <form action={revokePlanGrantAction}>
                          <input type="hidden" name="id" value={grant.id} />
                          <button className="secondary-button" type="submit">
                            Revoke
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
