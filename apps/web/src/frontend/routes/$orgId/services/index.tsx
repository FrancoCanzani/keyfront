import { ServicesPage } from "@/features/services/services-list";
import { servicesQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().default(""),
});

export const Route = createFileRoute("/$orgId/services/")({
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQuery),
  component: ServicesPage,
});
