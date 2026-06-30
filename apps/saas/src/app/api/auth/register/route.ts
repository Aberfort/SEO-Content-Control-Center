import { ZodError } from "zod";

import { registerWithPassword } from "@/lib/auth";
import { jsonError, validationError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await registerWithPassword((await request.json()) as unknown);
    return Response.json({ data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return jsonError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists."
      );
    }

    return jsonError(400, "REGISTER_FAILED", "Could not create account.");
  }
}
