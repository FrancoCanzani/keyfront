import { createOpenAPI } from "fumadocs-openapi/server";
import { cache } from "react";

const CONTROL_PLANE_URL =
  process.env.CONTROL_PLANE_URL ?? "http://localhost:8787";

export type Reference = {
  service: { name: string; hostKey: string };
  gatewayUrl: string;
  document: Record<string, unknown>;
};

export const fetchReference = cache(
  async (hostKey: string, token: string): Promise<Reference | null> => {
    const res = await fetch(
      `${CONTROL_PLANE_URL}/api/reference/${encodeURIComponent(hostKey)}?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    ).catch(() => null);
    if (!res?.ok) return null;
    return (await res.json()) as Reference;
  },
);

export async function getReferencePage(reference: Reference) {
  const openapi = createOpenAPI({
    input: { [reference.service.hostKey]: () => reference.document as never },
    disableCache: true,
    proxyUrl: `/r/${reference.service.hostKey}/proxy`,
  });
  const source = await openapi.staticSource({ per: "file" });
  const page = source.files.find((file) => file.type === "page");
  if (!page) return null;
  return page.data;
}
