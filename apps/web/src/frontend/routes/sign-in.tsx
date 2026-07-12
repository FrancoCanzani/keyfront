import { SignIn } from "@/features/auth/sign-in";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: SignIn,
});
