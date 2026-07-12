import { client } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type Identity = InferResponseType<
  (typeof client.api.identities)["$get"]
>[number];

export const identitiesQueryOptions = queryOptions({
  queryKey: ["identities"],
  queryFn: async () => {
    const res = await client.api.identities.$get();
    if (!res.ok) {
      throw new Error("Failed to load identities");
    }
    return res.json();
  },
});
