import { GeneralSettingsPage } from "@/features/organization/general-settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/settings/")({
  component: GeneralSettingsPage,
});
