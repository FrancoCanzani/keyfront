import { Overview } from "@/features/dashboard/overview";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});
