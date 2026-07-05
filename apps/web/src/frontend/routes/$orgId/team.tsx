import { TeamPage } from "@/features/organization/team";
import {
  orgInfoQuery,
  orgInvitationsQuery,
  orgMembersQuery,
} from "@/lib/organization-queries";
import { canManageOrg } from "@/lib/org-roles";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/team")({
  loader: async ({ context, params }) => {
    const orgInfo = await context.queryClient.ensureQueryData(
      orgInfoQuery(params.orgId),
    );
    await context.queryClient.ensureQueryData(orgMembersQuery(params.orgId));
    if (canManageOrg(orgInfo.role)) {
      await context.queryClient.ensureQueryData(
        orgInvitationsQuery(params.orgId),
      );
    }
  },
  component: TeamPage,
});
