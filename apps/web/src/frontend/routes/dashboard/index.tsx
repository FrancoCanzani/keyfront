import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Links</h1>
      <p className="mt-2 text-sm text-muted-foreground">No links yet.</p>
    </div>
  );
}
