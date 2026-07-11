import { client } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type Service = InferResponseType<
  (typeof client.api.services)["$get"]
>[number];

export const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: async () => {
    const res = await client.api.services.$get();
    if (!res.ok) {
      throw new Error("Failed to load services");
    }
    return res.json();
  },
});
