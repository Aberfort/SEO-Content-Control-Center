import { ZodError } from "zod";

import { loginWithPassword } from "@/lib/auth";
import { jsonError, validationError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await loginWithPassword((await request.json()) as unknown);
    return Response.json({ data: user });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return jsonError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    return jsonError(400, "LOGIN_FAILED", "Could not sign in.");
  }
}
