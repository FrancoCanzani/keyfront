import { Label } from "@/components/ui/label";
import { firstFormError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function FormHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <h2 className="font-heading text-sm font-medium">{title}</h2>
      {description ? (
        <p className="text-sm/relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function FormSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("grid scroll-mt-24 gap-5", className)}>
      <FormHeader title={title} description={description} />
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

export function FormFieldGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("grid gap-1.5", className)}>{children}</div>;
}

export function FormFieldLabel({
  htmlFor,
  className,
  children,
}: {
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className={cn("text-xs font-normal", className)}>
      {children}
    </Label>
  );
}

export function FormFieldHint({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className="text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function FormFieldError({
  id,
  errors,
}: {
  id?: string;
  errors: unknown[];
}) {
  const message = firstFormError(errors);
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="text-xs leading-relaxed text-destructive"
    >
      {message}
    </p>
  );
}

type FieldA11ySource = {
  name: string;
  state: { meta: { errors: unknown[]; isTouched: boolean } };
};

export function fieldErrors(field: FieldA11ySource): unknown[] {
  return field.state.meta.isTouched ? field.state.meta.errors : [];
}

export function fieldA11y(field: FieldA11ySource, hasHint = false) {
  const hasError = fieldErrors(field).length > 0;
  const describedBy = [
    hasHint ? `${field.name}-hint` : null,
    hasError ? `${field.name}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    "aria-invalid": hasError,
    "aria-describedby": describedBy || undefined,
  };
}

export function focusFirstInvalid(formEl: HTMLFormElement | null) {
  const el = formEl?.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!el) return;
  const details = el.closest("details");
  if (details && !details.open) details.open = true;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "center", behavior: "smooth" });
}

export const controlClassName = "h-8 w-full min-w-0";
