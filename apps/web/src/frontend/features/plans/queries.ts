import { client } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type Plan = InferResponseType<
  (typeof client.api.plans)["$get"]
>[number];

export const plansQueryOptions = queryOptions({
  queryKey: ["plans"],
  queryFn: async () => {
    const res = await client.api.plans.$get();
    if (!res.ok) {
      throw new Error("Failed to load plans");
    }
    return res.json();
  },
});
