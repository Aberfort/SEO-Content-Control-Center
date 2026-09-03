import { redirect } from "next/navigation";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * `/dashboard` is a legacy alias for `/` (billing redirect URLs configured in
 * Stripe still point here). Query params must survive the redirect: they are
 * how the workspace page shows checkout success/error/cancel state.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry !== undefined) {
        query.append(key, entry);
      }
    }
  }

  const queryString = query.toString();
  redirect(queryString ? `/?${queryString}` : "/");
}
