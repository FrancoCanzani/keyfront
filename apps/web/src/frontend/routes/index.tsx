import { HomePage } from "@/features/home";
import { authClient } from "@/lib/auth-client";
import { isValidPostAuthRedirect } from "@/lib/auth-redirect";
import { postAuthRedirectTarget } from "@/lib/post-auth-redirect";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { data } = await authClient.getSession();
    if (data) {
      const redirectTo =
        search.redirect && isValidPostAuthRedirect(search.redirect)
          ? search.redirect
          : undefined;
      throw redirect(await postAuthRedirectTarget(data, redirectTo));
    }
  },
  component: HomePage,
});
