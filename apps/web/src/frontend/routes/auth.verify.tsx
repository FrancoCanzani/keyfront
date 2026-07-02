import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { Verify } from "@/features/auth/verify";

const searchSchema = z.object({
  token: z.string().optional(),
  callbackURL: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/auth/verify")({
  validateSearch: searchSchema,
  component: Verify,
});
