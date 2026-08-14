import { WorkspacePage } from "@/app/page";

type ContentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function ContentPage(props: ContentPageProps) {
  return <WorkspacePage {...props} view="content" />;
}
