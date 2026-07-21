import { LinksPage } from "@/features/links/links-page";
import { linksQueryOptions } from "@/features/links/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(linksQueryOptions),
  component: LinksPage,
});
