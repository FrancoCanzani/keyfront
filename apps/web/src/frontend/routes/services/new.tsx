import { redirectLegacyServicesPath } from "@/lib/legacy-redirect";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/services/new")({
  beforeLoad: async () => {
    throw redirect(await redirectLegacyServicesPath("/services/new"));
  },
});
