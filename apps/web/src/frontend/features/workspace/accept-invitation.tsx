import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const route = getRouteApi("/accept-invitation");

export function AcceptInvitationPage() {
  const { id } = route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invitationQuery = useQuery({
    queryKey: ["invitations", id],
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({
        query: { id },
      });
      if (error) {
        throw new Error(error.message ?? "Invitation not found");
      }
      return data;
    },
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.acceptInvitation({
        invitationId: id,
      });
      if (error) {
        throw new Error(error.message ?? "Failed to accept invitation");
      }
    },
    onSuccess: async () => {
      const organizationId = invitationQuery.data?.organizationId;
      if (organizationId) {
        await authClient.organization.setActive({ organizationId });
      }
      queryClient.clear();
      toast.success("Invitation accepted");
      await navigate({ to: "/dashboard" });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to accept invitation",
      ),
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.rejectInvitation({
        invitationId: id,
      });
      if (error) {
        throw new Error(error.message ?? "Failed to decline invitation");
      }
    },
    onSuccess: async () => {
      toast.success("Invitation declined");
      await navigate({ to: "/dashboard" });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to decline invitation",
      ),
  });

  const invitation = invitationQuery.data;

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
        <span className="text-sm tracking-[-0.02em]">Keyfront</span>
      </div>

      <div className="flex min-h-dvh items-center justify-center px-6 py-28">
        <section className="w-full max-w-84">
          {invitationQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading invitation...
            </p>
          ) : invitationQuery.isError || !invitation ? (
            <div>
              <h1 className="text-2xl font-medium leading-tight">
                Invitation not available
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                This invitation may have expired, been canceled, or belong to a
                different email address.
              </p>
              <Button
                className="mt-6"
                onClick={() => void navigate({ to: "/dashboard" })}
              >
                Go to dashboard
              </Button>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-medium leading-tight">
                Join {invitation.organizationName}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {invitation.inviterEmail} invited you to join{" "}
                <span className="font-medium text-foreground">
                  {invitation.organizationName}
                </span>{" "}
                as {invitation.role === "admin" ? "an admin" : "a member"}.
              </p>
              <div className="mt-6 flex gap-2">
                <Button
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate()}
                >
                  {acceptMutation.isPending
                    ? "Accepting..."
                    : "Accept invitation"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={declineMutation.isPending}
                  onClick={() => declineMutation.mutate()}
                >
                  Decline
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
