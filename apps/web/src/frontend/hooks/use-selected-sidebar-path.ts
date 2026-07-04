import { useParams, useRouterState } from "@tanstack/react-router";

export function useSelectedSidebarPath() {
  const { orgId } = useParams({ from: "/$orgId" });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const orgPrefix = `/${orgId}`;
  const selectedPath = normalizePath(
    pathname === orgPrefix
      ? "/"
      : pathname.startsWith(`${orgPrefix}/`)
        ? pathname.slice(orgPrefix.length)
        : pathname,
  );

  function isActive(to: string) {
    const target = normalizePath(to.replace("/$orgId", "") || "/");

    if (target === "/") {
      return selectedPath === target;
    }

    return selectedPath === target || selectedPath.startsWith(`${target}/`);
  }

  return { selectedPath, isActive };
}

function normalizePath(path: string) {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}
