import { redirectLegacyServicesPath } from "@/lib/legacy-redirect";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/services/$")({
  beforeLoad: async ({ params, location }) => {
    const legacyPath = `/services/${params._splat ?? ""}${location.search}`.replace(
      /\/$/,
      "",
    );
    throw redirect(await redirectLegacyServicesPath(legacyPath));
  },
});
