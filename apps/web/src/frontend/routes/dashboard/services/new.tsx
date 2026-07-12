import { NewServicePage } from "@/features/services/new-service-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/services/new")({
  component: NewServicePage,
});
