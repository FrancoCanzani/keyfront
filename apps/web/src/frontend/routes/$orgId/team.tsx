import { TeamPage } from "@/features/organization/team";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/team")({
  component: TeamPage,
});
