import { WorkspacePage } from "@/app/page";

type BacklogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function BacklogPage(props: BacklogPageProps) {
  return <WorkspacePage {...props} view="backlog" />;
}
