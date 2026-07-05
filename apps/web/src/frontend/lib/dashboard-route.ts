const RESERVED_SERVICE_SEGMENTS = new Set(["new", "services"]);

export function parseDashboardRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const orgId = segments[0] ?? null;
  const section = segments[1] ?? null;

  const candidate =
    section === "services" && segments[2] ? segments[2] : null;

  const serviceId =
    candidate && !RESERVED_SERVICE_SEGMENTS.has(candidate) ? candidate : null;

  const isOrgAdmin = section === "settings" || section === "team";

  return {
    orgId,
    serviceId,
    isServiceDetail: serviceId != null,
    isOrgAdmin,
  };
}
