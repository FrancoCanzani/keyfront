import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/rpc";

export type OrgInfo = {
  id: string;
  name: string;
  role: string;
};

export type OrgMemberRow = {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
};

export type OrgInvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
  createdAt?: Date | string;
};

export type FullOrganization = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | string;
  members?: OrgMemberRow[];
  invitations?: OrgInvitationRow[];
};

function unwrapAuth<T>(result: {
  data?: T | null;
  error?: { message?: string } | null;
}): T {
  if (result.error) {
    throw new Error(result.error.message ?? "Request failed");
  }
  if (result.data == null) {
    throw new Error("Request failed");
  }
  return result.data;
}

export const orgInfoQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["organization-info", orgId],
    queryFn: async (): Promise<OrgInfo> => {
      const res = await client.api.organization.info.$get();
      if (!res.ok) {
        throw Object.assign(new Error("Failed to load organization"), {
          status: res.status,
        });
      }
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });

export const fullOrganizationQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["organization-full", orgId],
    queryFn: async (): Promise<FullOrganization> => {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      return unwrapAuth(result) as FullOrganization;
    },
    staleTime: 30_000,
  });

export const orgMembersQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["organization-members", orgId],
    queryFn: async (): Promise<OrgMemberRow[]> => {
      const result = await authClient.organization.listMembers({
        query: { organizationId: orgId },
      });
      const data = unwrapAuth(result) as { members: OrgMemberRow[] };
      return data.members;
    },
    staleTime: 30_000,
  });

export const orgInvitationsQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["organization-invitations", orgId],
    queryFn: async (): Promise<OrgInvitationRow[]> => {
      const result = await authClient.organization.listInvitations({
        query: { organizationId: orgId },
      });
      const invitations = unwrapAuth(result) as OrgInvitationRow[];
      return invitations.filter((row) => row.status === "pending");
    },
    staleTime: 30_000,
  });
