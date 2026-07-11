import { NewPlanPage } from "@/features/plans/new-plan-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/plans/new")({
  component: NewPlanPage,
});
