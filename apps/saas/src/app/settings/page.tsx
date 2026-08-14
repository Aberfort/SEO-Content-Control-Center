import { WorkspacePage } from "@/app/page";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function SettingsPage(props: SettingsPageProps) {
  return <WorkspacePage {...props} view="settings" />;
}
