import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { SignIn } from "@/features/auth/sign-in";

const searchSchema = z.object({
  error: z.string().optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: searchSchema,
  component: SignIn,
});
