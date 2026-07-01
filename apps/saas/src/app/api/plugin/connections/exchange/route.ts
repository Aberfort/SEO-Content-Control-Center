import { ZodError } from "zod";

import { jsonError, validationError } from "@/lib/http";
import { exchangePluginConnectionChallenge } from "@/lib/plugin-connection";

export async function POST(request: Request) {
  try {
    const connection = await exchangePluginConnectionChallenge((await request.json()) as unknown);
    return Response.json({ data: connection });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationError(error);
    }

    if (error instanceof Error && error.message === "CONNECTION_CHALLENGE_NOT_FOUND") {
      return jsonError(
        404,
        "CONNECTION_CHALLENGE_NOT_FOUND",
        "Connection challenge was not found."
      );
    }

    if (error instanceof Error && error.message === "CONNECTION_CHALLENGE_USED") {
      return jsonError(409, "CONNECTION_CHALLENGE_USED", "Connection challenge was already used.");
    }

    if (error instanceof Error && error.message === "CONNECTION_CHALLENGE_EXPIRED") {
      return jsonError(410, "CONNECTION_CHALLENGE_EXPIRED", "Connection challenge has expired.");
    }

    return jsonError(400, "CONNECTION_EXCHANGE_FAILED", "Could not exchange connection challenge.");
  }
}
