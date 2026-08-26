import Link from "next/link";

import { OperationApprovalResponseForm } from "@/components/operation-approval-response-form";
import { getAppRepository } from "@/lib/app-repository";
import { siteName } from "@/lib/brand";

type ApprovePageProps = {
  params: Promise<{ token: string }>;
};

const statusCopy: Record<string, string> = {
  APPROVED: "You approved this change. The agency has been notified and can proceed.",
  DECLINED: "You declined this change. Nothing was applied.",
  EXPIRED: "This approval link has expired. Ask the agency to send a new one."
};

export default async function ApproveOperationPage({ params }: ApprovePageProps) {
  const { token } = await params;
  const repository = getAppRepository();
  const approval = await repository.getPublicOperationApproval(token);

  return (
    <main className="auth-page">
      <section className="auth-panel approval-panel">
        <Link className="auth-brand" href="/">
          {siteName}
        </Link>
        <h1>Review requested change.</h1>

        {!approval ? (
          <p className="form-error">This approval link is invalid.</p>
        ) : (
          <>
            <p>
              <strong>{approval.organizationName}</strong> is requesting your approval to apply a
              change on <strong>{approval.siteName}</strong> ({approval.siteUrl}).
            </p>

            <dl className="approval-summary">
              <div>
                <dt>Change type</dt>
                <dd>{approval.operationType.replaceAll("_", " ").toLowerCase()}</dd>
              </div>
              <div>
                <dt>Pages affected</dt>
                <dd>{approval.itemCount}</dd>
              </div>
              {approval.previewSummary ? (
                <div>
                  <dt>Preview</dt>
                  <dd>{approval.previewSummary}</dd>
                </div>
              ) : null}
              {approval.dryRunSummary ? (
                <div>
                  <dt>Dry run</dt>
                  <dd>{approval.dryRunSummary}</dd>
                </div>
              ) : null}
            </dl>

            {approval.status === "PENDING" ? (
              <OperationApprovalResponseForm token={token} />
            ) : (
              <p className="approval-resolved">
                {statusCopy[approval.status] ?? "This request has already been resolved."}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
