import { redirectLegacyServicesPath } from "@/lib/legacy-redirect";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/services/")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const q =
      search.q != null && search.q !== ""
        ? `?q=${encodeURIComponent(search.q)}`
        : "";
    throw redirect(await redirectLegacyServicesPath(`/services${q}`));
  },
});
