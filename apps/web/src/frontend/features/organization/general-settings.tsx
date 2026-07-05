import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  controlClassName,
  fieldA11y,
  fieldErrors,
  FormFieldError,
  FormFieldGroup,
  FormFieldHint,
  FormFieldLabel,
  FormSection,
} from "@/components/form-layout";
import { authClient } from "@/lib/auth-client";
import { servicesQuery } from "@/lib/gateway-queries";
import {
  fullOrganizationQuery,
} from "@/lib/organization-queries";
import {
  canManageOrg,
  isOrgOwner,
} from "@/lib/org-roles";
import { postAuthRedirectTarget } from "@/lib/post-auth-redirect";

const route = getRouteApi("/$orgId");

const orgNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  firstName: z.string(),
  lastName: z.string(),
  position: z.string(),
});

export function GeneralSettingsPage() {
  const { orgId } = route.useParams();
  const { user, organization } = route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fullOrg } = useSuspenseQuery(fullOrganizationQuery(orgId));
  const { data: services } = useSuspenseQuery(servicesQuery);

  const canEditOrg = canManageOrg(organization.role);
  const owner = isOrgOwner(organization.role);
  const hasServices = services.length > 0;

  const updateOrg = useMutation({
    mutationFn: async (name: string) => {
      const result = await authClient.organization.update({
        organizationId: orgId,
        data: { name },
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to update organization");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Organization updated");
      queryClient.invalidateQueries({ queryKey: ["organization-info", orgId] });
      queryClient.invalidateQueries({ queryKey: ["organization-full", orgId] });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (value: z.infer<typeof profileSchema>) => {
      const result = await authClient.updateUser({
        name: value.name,
        firstName: value.firstName.trim() || undefined,
        lastName: value.lastName.trim() || undefined,
        position: value.position.trim() || undefined,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to update profile");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Profile updated");
    },
  });

  const leaveOrg = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.leave({
        organizationId: orgId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to leave organization");
      }
      return result.data;
    },
    onSuccess: async () => {
      queryClient.clear();
      const session = await authClient.getSession();
      if (session.data) {
        navigate(await postAuthRedirectTarget(session.data));
      } else {
        navigate({ to: "/sign-in" });
      }
    },
  });

  const deleteOrg = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.delete({
        organizationId: orgId,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to delete organization");
      }
      return result.data;
    },
    onSuccess: async () => {
      queryClient.clear();
      const session = await authClient.getSession();
      if (session.data) {
        navigate(await postAuthRedirectTarget(session.data));
      } else {
        navigate({ to: "/sign-in" });
      }
    },
  });

  const orgForm = useForm({
    defaultValues: { name: fullOrg.name },
    validators: { onBlur: orgNameSchema, onSubmit: orgNameSchema },
    onSubmit: ({ value }) => updateOrg.mutateAsync(value.name),
  });

  const profileForm = useForm({
    defaultValues: {
      name: user.name,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      position: user.position ?? "",
    },
    validators: { onBlur: profileSchema, onSubmit: profileSchema },
    onSubmit: ({ value }) => updateProfile.mutateAsync(value),
  });

  async function copyOrgId() {
    await navigator.clipboard.writeText(orgId);
    toast.success("Organization ID copied");
  }

  return (
    <div className="max-w-2xl space-y-8">
      <FormSection
        title="Organization"
        description="Name and identifiers for this organization."
      >
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            orgForm.handleSubmit();
          }}
        >
          <orgForm.Field name="name">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Name</FormFieldLabel>
                <Input
                  id={field.name}
                  className={controlClassName}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={!canEditOrg || updateOrg.isPending}
                  {...fieldA11y(field)}
                />
                <FormFieldError
                  id={`${field.name}-error`}
                  errors={fieldErrors(field)}
                />
              </FormFieldGroup>
            )}
          </orgForm.Field>

          <FormFieldGroup>
            <FormFieldLabel htmlFor="org-id">Organization ID</FormFieldLabel>
            <div className="flex gap-2">
              <Input
                id="org-id"
                className={controlClassName}
                value={orgId}
                readOnly
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={copyOrgId}
              >
                Copy
              </Button>
            </div>
          </FormFieldGroup>

          <FormFieldGroup>
            <FormFieldLabel htmlFor="org-slug">Slug</FormFieldLabel>
            <Input
              id="org-slug"
              className={controlClassName}
              value={fullOrg.slug}
              readOnly
            />
            <FormFieldHint id="org-slug-hint">
              Slug changes are not supported yet.
            </FormFieldHint>
          </FormFieldGroup>

          {updateOrg.error ? (
            <p role="alert" className="text-xs text-destructive">
              {updateOrg.error.message}
            </p>
          ) : null}

          {canEditOrg ? (
            <div>
              <orgForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    size="default"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? "Saving…" : "Save changes"}
                  </Button>
                )}
              </orgForm.Subscribe>
            </div>
          ) : null}
        </form>
      </FormSection>

      <FormSection
        title="Your profile"
        description="How your name appears across the dashboard."
      >
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            profileForm.handleSubmit();
          }}
        >
          <FormFieldGroup>
            <FormFieldLabel htmlFor="email">Email</FormFieldLabel>
            <Input
              id="email"
              className={controlClassName}
              value={user.email}
              readOnly
            />
          </FormFieldGroup>

          <profileForm.Field name="name">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Display name</FormFieldLabel>
                <Input
                  id={field.name}
                  className={controlClassName}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  {...fieldA11y(field)}
                />
                <FormFieldError
                  id={`${field.name}-error`}
                  errors={fieldErrors(field)}
                />
              </FormFieldGroup>
            )}
          </profileForm.Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <profileForm.Field name="firstName">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>First name</FormFieldLabel>
                  <Input
                    id={field.name}
                    className={controlClassName}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormFieldGroup>
              )}
            </profileForm.Field>

            <profileForm.Field name="lastName">
              {(field) => (
                <FormFieldGroup>
                  <FormFieldLabel htmlFor={field.name}>Last name</FormFieldLabel>
                  <Input
                    id={field.name}
                    className={controlClassName}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormFieldGroup>
              )}
            </profileForm.Field>
          </div>

          <profileForm.Field name="position">
            {(field) => (
              <FormFieldGroup>
                <FormFieldLabel htmlFor={field.name}>Role / title</FormFieldLabel>
                <Input
                  id={field.name}
                  className={controlClassName}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Engineering lead"
                />
              </FormFieldGroup>
            )}
          </profileForm.Field>

          {updateProfile.error ? (
            <p role="alert" className="text-xs text-destructive">
              {updateProfile.error.message}
            </p>
          ) : null}

          <div>
            <profileForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="default"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save profile"}
                </Button>
              )}
            </profileForm.Subscribe>
          </div>
        </form>
      </FormSection>

      <section className="grid gap-4 border-t pt-6">
        <div className="grid gap-1">
          <h2 className="font-heading text-sm font-medium text-destructive">
            Danger zone
          </h2>
          <p className="text-sm/relaxed text-muted-foreground">
            {owner
              ? "Delete this organization permanently. All services must be removed first."
              : "Leave this organization. You will lose access to its services and keys."}
          </p>
        </div>
        <div>
          {owner ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="default"
                    disabled={hasServices || deleteOrg.isPending}
                  >
                    Delete organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete "{organization.name}"?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the organization and all members. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteOrg.mutate()}>
                      Delete organization
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {hasServices ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Delete all services before removing this organization.
                </p>
              ) : null}
              {deleteOrg.error ? (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {deleteOrg.error.message}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="default"
                    disabled={leaveOrg.isPending}
                  >
                    Leave organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Leave "{organization.name}"?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      You will lose access to this organization's services, keys,
                      and logs.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => leaveOrg.mutate()}>
                      Leave organization
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {leaveOrg.error ? (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {leaveOrg.error.message}
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
