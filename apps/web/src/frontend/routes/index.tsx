import { Landing } from "@/features/landing/landing";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});
