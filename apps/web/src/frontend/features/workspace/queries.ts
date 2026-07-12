import { authClient } from "@/lib/auth-client";
import { queryOptions } from "@tanstack/react-query";

export const workspacesQueryOptions = queryOptions({
  queryKey: ["workspaces"],
  queryFn: async () => {
    const { data, error } = await authClient.organization.list();
    if (error) {
      throw new Error(error.message ?? "Failed to load workspaces");
    }
    return data;
  },
});

export const activeWorkspaceQueryOptions = queryOptions({
  queryKey: ["workspaces", "active"],
  queryFn: async () => {
    const { data, error } = await authClient.organization.getFullOrganization();
    if (error) {
      throw new Error(error.message ?? "Failed to load workspace");
    }
    return data;
  },
});

export type Workspace = NonNullable<
  Awaited<ReturnType<NonNullable<(typeof workspacesQueryOptions)["queryFn"]>>>
>[number];

export type ActiveWorkspace = NonNullable<
  Awaited<
    ReturnType<NonNullable<(typeof activeWorkspaceQueryOptions)["queryFn"]>>
  >
>;

export type WorkspaceMember = ActiveWorkspace["members"][number];
export type WorkspaceInvitation = ActiveWorkspace["invitations"][number];
