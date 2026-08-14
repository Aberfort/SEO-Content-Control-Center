import { WorkspacePage } from "@/app/page";

type AuditsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AuditsPage(props: AuditsPageProps) {
  return <WorkspacePage {...props} view="audits" />;
}
