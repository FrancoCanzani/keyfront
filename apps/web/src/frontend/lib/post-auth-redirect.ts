import { isValidPostAuthRedirect } from "@/lib/auth-redirect";
import { authClient } from "@/lib/auth-client";
import { isLegacyAppPath, parseLegacyRedirect } from "@/lib/legacy-redirect";
import type { NavigateOptions } from "@tanstack/react-router";

type SessionPayload = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>;

async function resolveOrgId(data: SessionPayload): Promise<string | null> {
  let orgId = data.session.activeOrganizationId;
  if (!orgId) {
    const orgs = await authClient.organization.list();
    orgId = orgs.data?.[0]?.id ?? null;
  }
  return orgId;
}

export async function postAuthRedirectTarget(
  data: SessionPayload,
  redirectTo?: string,
): Promise<NavigateOptions> {
  const orgId = await resolveOrgId(data);

  if (redirectTo) {
    if (orgId) {
      const legacy = parseLegacyRedirect(redirectTo, orgId);
      if (legacy) return legacy;
    }
    if (isLegacyAppPath(redirectTo)) {
      return { to: "/onboarding" as const };
    }
    if (isValidPostAuthRedirect(redirectTo)) {
      return { href: redirectTo } as const;
    }
  }

  if (orgId) {
    return {
      to: "/$orgId/services",
      params: { orgId },
    };
  }

  return { to: "/onboarding" as const };
}

export function redirectToFromCallbackUrl(
  callbackURL?: string,
): string | undefined {
  if (!callbackURL) return undefined;

  try {
    const url = new URL(callbackURL, "http://local");
    if (url.pathname === "/" && url.searchParams.has("redirect")) {
      const value = url.searchParams.get("redirect");
      if (value) return value;
    }
    const path = `${url.pathname}${url.search}`;
    return path.startsWith("/") ? path : undefined;
  } catch {
    // fall through
  }

  if (callbackURL.startsWith("/")) return callbackURL;
  return undefined;
}
