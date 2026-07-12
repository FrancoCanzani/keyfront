import { AcceptInvitationPage } from "@/features/workspace/accept-invitation";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/accept-invitation")({
  validateSearch: z.object({
    id: z.string(),
  }),
  beforeLoad: async ({ search }) => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: `/accept-invitation?id=${search.id}` },
      });
    }
  },
  component: AcceptInvitationPage,
});
