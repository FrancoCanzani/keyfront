import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/$orgId/settings/")({
  component: GeneralSettingsPage,
});

function GeneralSettingsPage() {
  return (
    <>
      <PageHeader title="General" />
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Organization configuration will live here.
        </p>
      </div>
    </>
  );
}
