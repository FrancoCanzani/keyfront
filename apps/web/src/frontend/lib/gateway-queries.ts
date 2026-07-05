import { queryOptions } from "@tanstack/react-query";
import { client } from "./rpc";

export type UsageSearch = {
  range?: "24h" | "7d" | "30d";
  key?: string;
  consumer?: string;
};

export const usageQuery = (serviceId: string, search: UsageSearch = {}) =>
  queryOptions({
    queryKey: ["usage", serviceId, search],
    queryFn: async () => {
      const res = await client.api.usage.$get({
        query: {
          serviceId,
          range: search.range ?? "7d",
          key: search.key ?? "",
          consumer: search.consumer ?? "all",
        },
      });
      if (!res.ok) throw new Error("Failed to load usage");
      return res.json();
    },
    refetchInterval: 30_000,
  });

export type LogsSearch = {
  page?: number;
  limit?: number;
  status?: "all" | "2xx" | "4xx" | "5xx";
  method?: string;
  key?: string;
  sort?: "ts" | "status" | "ms" | "method" | "path";
  order?: "asc" | "desc";
};

export const logsQuery = (serviceId: string, search: LogsSearch = {}) =>
  queryOptions({
    queryKey: ["logs", serviceId, search],
    queryFn: async () => {
      const res = await client.api.logs.$get({
        query: {
          serviceId,
          page: String(search.page ?? 1),
          limit: String(search.limit ?? 50),
          status: search.status ?? "all",
          method: search.method ?? "all",
          key: search.key ?? "",
          sort: search.sort ?? "ts",
          order: search.order ?? "desc",
        },
      });
      if (!res.ok) throw new Error("Failed to load recent requests");
      return res.json();
    },
  });

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

export const specQuery = (serviceId: string) =>
  queryOptions({
    queryKey: ["spec", serviceId],
    queryFn: async () => {
      const res = await client.api.specs.$get({ query: { serviceId } });
      if (!res.ok) throw new Error("Failed to load API reference");
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
