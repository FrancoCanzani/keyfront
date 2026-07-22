import { client } from "@/lib/api";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type Link = InferResponseType<(typeof client.api.links)["$get"]>[number];

export const linksQueryOptions = queryOptions({
  queryKey: ["links"],
  queryFn: async () => {
    const res = await client.api.links.$get();
    if (!res.ok) {
      throw new Error("Failed to load links");
    }
    return res.json();
  },
});

export function useCreateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: { url: string }) => {
      const res = await client.api.links.$post({ json });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to create link");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
    },
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client.api.links[":id"].$delete({ param: { id } });
      if (!res.ok) {
        throw new Error("Failed to delete link");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
    },
  });
}
