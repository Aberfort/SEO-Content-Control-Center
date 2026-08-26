import { WorkspacePage } from "@/app/page";

type MonitoringPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function MonitoringPage(props: MonitoringPageProps) {
  return <WorkspacePage {...props} view="monitoring" />;
}
