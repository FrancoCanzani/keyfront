import { queryOptions } from "@tanstack/react-query";
import { client } from "./rpc";

export const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: async () => {
    const res = await client.api.services.$get();
    if (!res.ok) throw new Error("Failed to load services");
    return res.json();
  },
});

export const serviceQuery = (id: string) =>
  queryOptions({
    queryKey: ["services", id],
    queryFn: async () => {
      const res = await client.api.services[":id"].$get({ param: { id } });
      if (!res.ok) throw new Error("Failed to load service");
      return res.json();
    },
  });

export const plansQuery = (serviceId: string) =>
  queryOptions({
    queryKey: ["plans", serviceId],
    queryFn: async () => {
      const res = await client.api.plans.$get({ query: { serviceId } });
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json();
    },
  });

export const consumersQuery = (serviceId: string) =>
  queryOptions({
    queryKey: ["consumers", serviceId],
    queryFn: async () => {
      const res = await client.api.consumers.$get({ query: { serviceId } });
      if (!res.ok) throw new Error("Failed to load consumers");
      return res.json();
    },
  });

export const keysQuery = (serviceId: string) =>
  queryOptions({
    queryKey: ["keys", serviceId],
    queryFn: async () => {
      const res = await client.api.keys.$get({ query: { serviceId } });
      if (!res.ok) throw new Error("Failed to load keys");
      return res.json();
    },
  });

// dev: *.localhost resolves to 127.0.0.1, so curl hits the local gateway directly
export const gatewayDomain =
  import.meta.env.VITE_GATEWAY_DOMAIN ?? "localhost:8080";

export async function readApiError(res: Response, fallback: string) {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}
