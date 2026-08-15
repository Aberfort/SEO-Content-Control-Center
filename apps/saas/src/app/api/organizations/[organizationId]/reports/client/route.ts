import {
  clientReportQuerySchema,
  formatClientReportCsv,
  formatClientReportHtml
} from "@sccc/shared";
import { ZodError } from "zod";

import { getAppRepository } from "@/lib/app-repository";
import { getCurrentUser } from "@/lib/auth";
import { commercialAccessError, jsonError, unauthorizedError, validationError } from "@/lib/http";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) return unauthorizedError();

  const { organizationId } = await context.params;

  try {
    const url = new URL(request.url);
    const query = clientReportQuerySchema.parse({
      siteId: url.searchParams.get("siteId") || undefined,
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate"),
      format: url.searchParams.get("format") || undefined
    });
    const report = await getAppRepository().getClientReport(user.id, organizationId, query);
    const extension = query.format === "csv" ? "csv" : "html";
    const body =
      query.format === "csv" ? formatClientReportCsv(report) : formatClientReportHtml(report);

    return new Response(body, {
      headers: {
        "content-type":
          query.format === "csv" ? "text/csv; charset=utf-8" : "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="seo-client-report-${query.startDate}-${query.endDate}.${extension}"`,
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    const commercialResponse = commercialAccessError(error);
    if (commercialResponse) return commercialResponse;
    return jsonError(404, "REPORT_SCOPE_NOT_FOUND", "Report scope was not found.");
  }
}
