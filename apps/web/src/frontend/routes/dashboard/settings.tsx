import { activeWorkspaceQueryOptions } from "@/features/workspace/queries";
import { WorkspaceSettingsPage } from "@/features/workspace/workspace-settings-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(activeWorkspaceQueryOptions),
  component: WorkspaceSettingsPage,
});
