const CREATOR_ROLE = "owner";

export function parseRoles(role: string): string[] {
  return role
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function hasRole(role: string, target: string): boolean {
  return parseRoles(role).includes(target);
}

export function isOrgOwner(role: string): boolean {
  return hasRole(role, CREATOR_ROLE);
}

export function canManageOrg(role: string): boolean {
  return isOrgOwner(role) || hasRole(role, "admin");
}

export function formatRoleLabel(role: string): string {
  const primary = parseRoles(role)[0] ?? role;
  return primary.charAt(0).toUpperCase() + primary.slice(1);
}
