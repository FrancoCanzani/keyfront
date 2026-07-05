import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
  key: z.string().default(""),
  consumer: z.string().default("all"),
});

export const Route = createFileRoute("/$orgId/services/$serviceId/usage")({
  validateSearch: searchSchema,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/$orgId/services/$serviceId",
      params: { orgId: params.orgId, serviceId: params.serviceId },
      search,
    });
  },
});
