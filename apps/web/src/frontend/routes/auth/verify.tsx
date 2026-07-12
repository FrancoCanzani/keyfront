import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/auth/verify")({
  validateSearch: z.object({
    token: z.string(),
  }),
  beforeLoad: async ({ search }) => {
    const { data, error } = await authClient.magicLink.verify({
      query: { token: search.token },
    });

    if (error || !data?.session) {
      throw redirect({ to: "/sign-in", replace: true });
    }

    throw redirect({ to: "/dashboard", replace: true });
  },
});
