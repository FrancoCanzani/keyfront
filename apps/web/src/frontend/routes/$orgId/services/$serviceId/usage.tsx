import { ServiceUsagePage } from "@/features/services/service-usage";
import { usageQuery } from "@/lib/gateway-queries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/usage")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ range: search.range }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      usageQuery(params.serviceId, deps.range),
    ),
  component: ServiceUsagePage,
});
