import { client } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type Plan = InferResponseType<
  (typeof client.api.plans)["$get"],
  200
>[number];

export const plansQueryOptions = (serviceId: string) =>
  queryOptions({
    queryKey: ["plans", serviceId],
    queryFn: async () => {
      const res = await client.api.plans.$get({ query: { serviceId } });
      if (!res.ok) {
        throw new Error("Failed to load plans");
      }
      return res.json();
    },
  });
