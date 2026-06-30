import { logoutCurrentSession } from "@/lib/auth";

export async function POST() {
  await logoutCurrentSession();
  return Response.json({ data: { ok: true } });
}
