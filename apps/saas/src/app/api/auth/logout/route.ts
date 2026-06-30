import { logoutCurrentSession } from "@/lib/auth";
import { assertRequestSameOrigin } from "@/lib/csrf";
import { securityError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertRequestSameOrigin(request);
    await logoutCurrentSession();
    return Response.json({ data: { ok: true } });
  } catch (error) {
    const response = securityError(error);

    if (response) {
      return response;
    }

    throw error;
  }
}
