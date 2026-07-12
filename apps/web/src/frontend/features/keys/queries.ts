import { client } from "@/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type ServiceKey = InferResponseType<
  (typeof client.api.keys)["$get"],
  200
>[number];

export const keysQueryOptions = (serviceId: string) =>
  queryOptions({
    queryKey: ["keys", serviceId],
    queryFn: async () => {
      const res = await client.api.keys.$get({ query: { serviceId } });
      if (!res.ok) {
        throw new Error("Failed to load keys");
      }
      return res.json();
    },
  });
