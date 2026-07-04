import { hc } from "hono/client";
import type { AppType } from "../../server/index";
import { getOrganizationId } from "./org-api";

export const client = hc<AppType>("/", {
  headers: () => {
    const orgId = getOrganizationId();
    return orgId
      ? { "x-organization-id": orgId }
      : ({} as Record<string, string>);
  },
});
