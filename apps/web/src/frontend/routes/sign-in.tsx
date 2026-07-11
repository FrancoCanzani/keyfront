import { SignIn } from "@/features/auth/sign-in";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in")({
  component: SignIn,
});
