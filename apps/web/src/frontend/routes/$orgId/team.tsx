import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/$orgId/team")({
  component: TeamPage,
});

function TeamPage() {
  return (
    <>
      <PageHeader title="Team" />
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Invite members and manage roles — coming soon.
        </p>
      </div>
    </>
  );
}
