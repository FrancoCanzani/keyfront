const RESERVED_ROOT_SEGMENTS = new Set([
  "sign-in",
  "auth",
  "api",
  "onboarding",
  "login",
  "signup",
  "accept-invitation",
  "services",
  "settings",
  "team",
]);

export function isValidPostAuthRedirect(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.startsWith("/accept-invitation/")) return true;
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment || RESERVED_ROOT_SEGMENTS.has(segment)) return false;
  return true;
}

export function isReservedOrgId(id: string): boolean {
  return RESERVED_ROOT_SEGMENTS.has(id);
}
