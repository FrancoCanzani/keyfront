import type { NavigateOptions } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

const LEGACY_APP_SEGMENTS = new Set(["services", "settings", "team"]);

export function isLegacyAppPath(pathname: string): boolean {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment != null && LEGACY_APP_SEGMENTS.has(segment);
}

export function parseLegacyRedirect(
  path: string,
  orgId: string,
): NavigateOptions | null {
  const url = new URL(path, "http://local");
  let pathname = url.pathname.replace(/\/$/, "") || "/";

  // Botched redirect when /services was treated as an org id.
  if (pathname.startsWith("/services/services")) {
    pathname = "/services";
  }

  if (pathname === "/services") {
    const q = url.searchParams.get("q");
    return {
      to: "/$orgId/services",
      params: { orgId },
      search: q != null && q !== "" ? { q } : {},
    };
  }

  if (!pathname.startsWith("/services/")) {
    return null;
  }

  const rest = pathname.slice("/services/".length);

  if (rest === "new") {
    return { to: "/$orgId/services", params: { orgId } };
  }

  const [serviceId, ...sub] = rest.split("/");
  if (!serviceId) return null;

  if (sub.length === 0) {
    return {
      to: "/$orgId/services/$serviceId",
      params: { orgId, serviceId },
    };
  }

  if (sub.length === 1 && (sub[0] === "plans" || sub[0] === "keys" || sub[0] === "settings")) {
    return {
      to: `/$orgId/services/$serviceId/${sub[0]}` as
        | "/$orgId/services/$serviceId/plans"
        | "/$orgId/services/$serviceId/keys"
        | "/$orgId/services/$serviceId/settings",
      params: { orgId, serviceId },
    };
  }

  return null;
}

export async function activeOrgServicesRedirect(
  getOrgId: () => Promise<string | null>,
  legacyPath?: string,
): Promise<NavigateOptions> {
  const orgId = await getOrgId();
  if (!orgId) {
    return { to: "/onboarding" };
  }

  if (legacyPath) {
    const legacy = parseLegacyRedirect(legacyPath, orgId);
    if (legacy) return legacy;
  }

  return { to: "/$orgId/services", params: { orgId } };
}

async function resolveOrgIdFromSession() {
  const { data } = await authClient.getSession();
  if (!data) return null;

  let orgId = data.session.activeOrganizationId;
  if (!orgId) {
    const orgs = await authClient.organization.list();
    orgId = orgs.data?.[0]?.id ?? null;
  }
  return orgId;
}

export async function redirectLegacyServicesPath(
  legacyPath: string,
): Promise<NavigateOptions> {
  const { data } = await authClient.getSession();
  if (!data) {
    return {
      to: "/sign-in",
      search: { redirect: legacyPath },
    };
  }

  return activeOrgServicesRedirect(resolveOrgIdFromSession, legacyPath);
}
