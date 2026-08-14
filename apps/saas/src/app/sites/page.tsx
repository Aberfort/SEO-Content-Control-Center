import { WorkspacePage } from "@/app/page";

type SitesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function SitesPage(props: SitesPageProps) {
  return <WorkspacePage {...props} view="sites" />;
}
