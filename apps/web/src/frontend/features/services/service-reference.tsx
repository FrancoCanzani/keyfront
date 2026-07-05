import { useRef, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { SectionHeading } from "@/components/section-heading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  controlClassName,
  FormFieldGroup,
  FormFieldHint,
  FormFieldLabel,
} from "@/components/form-layout";
import {
  REFERENCE_COL_WIDTHS,
  referenceColumns,
} from "@/features/services/reference/columns";
import { readApiError, specQuery } from "@/lib/gateway-queries";
import { client } from "@/lib/rpc";

const route = getRouteApi("/$orgId/services/$serviceId/reference");

export function ServiceReferencePage() {
  const { serviceId } = route.useParams();
  const { data } = useSuspenseQuery(specQuery(serviceId));
  const queryClient = useQueryClient();

  const syncSpec = useMutation({
    mutationFn: async () => {
      const res = await client.api.specs.sync.$post({ json: { serviceId } });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to re-sync spec"));
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(result.unchanged ? "Spec is up to date" : "Spec re-synced");
      queryClient.invalidateQueries({ queryKey: ["spec", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSpec = useMutation({
    mutationFn: async () => {
      const res = await client.api.specs[":serviceId"].$delete({
        param: { serviceId },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to remove spec"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Spec removed");
      queryClient.invalidateQueries({ queryKey: ["spec", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const table = useReactTable({
    data: data.operations,
    columns: referenceColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data.spec) {
    return (
      <div className="mx-auto w-full max-w-4xl text-xs">
        <section className="grid gap-5">
          <SectionHeading
            title="Reference"
            description="Attach an OpenAPI spec to get hosted docs, a playground, and per-endpoint analytics."
          />
          <Empty className="p-4 md:p-4">
            <EmptyHeader>
              <EmptyTitle className="text-sm">No spec attached</EmptyTitle>
              <EmptyDescription className="text-xs">
                Upload an OpenAPI file or point at a spec URL. Swagger 2.0 and
                OpenAPI 3.x, JSON or YAML.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <AttachSpecDialog serviceId={serviceId} label="Attach spec" />
            </EmptyContent>
          </Empty>
        </section>
      </div>
    );
  }

  const { spec } = data;

  return (
    <div className="mx-auto w-full max-w-4xl text-xs">
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading
            title="Reference"
            description="Hosted docs and playground generated from your OpenAPI spec."
          />
          <span className="shrink-0 font-data text-xs text-muted-foreground tabular-nums">
            {spec.operationsCount.toLocaleString()} endpoint
            {spec.operationsCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
            <MetaItem label="Title" value={spec.title ?? "Untitled"} />
            <MetaItem label="Version" value={spec.specVersion ?? "—"} />
            <MetaItem label="OpenAPI" value={spec.openapiVersion} />
            <MetaItem
              label="Source"
              value={spec.source === "url" ? (spec.sourceUrl ?? "URL") : "Upload"}
            />
            <MetaItem
              label="Updated"
              value={new Date(spec.createdAt).toLocaleString()}
            />
          </dl>
          <div className="flex items-center gap-2">
            {data.previewUrl ? (
              <Button asChild className="h-7">
                <a href={data.previewUrl} target="_blank" rel="noreferrer">
                  Open reference
                </a>
              </Button>
            ) : null}
            {spec.source === "url" ? (
              <Button
                variant="outline"
                className="h-7"
                disabled={syncSpec.isPending}
                onClick={() => syncSpec.mutate()}
              >
                {syncSpec.isPending ? "Re-syncing…" : "Re-sync"}
              </Button>
            ) : null}
            <AttachSpecDialog
              serviceId={serviceId}
              label="Replace"
              variant="outline"
            />
            <DeleteSpecButton
              onDelete={() => deleteSpec.mutate()}
              pending={deleteSpec.isPending}
            />
          </div>
        </div>

        {spec.warnings.length > 0 ? (
          <details className="rounded border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-amber-800 dark:text-amber-400">
            <summary className="cursor-pointer select-none">
              {spec.warnings.length} validation warning
              {spec.warnings.length === 1 ? "" : "s"} — the reference renders
              anyway
            </summary>
            <ul className="mt-2 grid list-disc gap-1 pl-4">
              {spec.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </details>
        ) : null}

        <DataTable
          variant="plain"
          size="sm"
          table={table}
          colWidths={REFERENCE_COL_WIDTHS}
        />
      </section>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <dt className="shrink-0">{label}</dt>
      <dd className="max-w-56 truncate font-data text-foreground">{value}</dd>
    </div>
  );
}

function DeleteSpecButton({
  onDelete,
  pending,
}: {
  onDelete: () => void;
  pending: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        className="h-7 text-destructive"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        Remove
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this spec?</AlertDialogTitle>
            <AlertDialogDescription>
              The hosted reference stops working and per-endpoint analytics
              stop matching. Traffic is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>
              Remove spec
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AttachSpecDialog({
  serviceId,
  label,
  variant = "default",
}: {
  serviceId: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadSpec = useMutation({
    mutationFn: async (input: { content?: string; url?: string }) => {
      const res = await client.api.specs.$post({
        json: { serviceId, ...input },
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to attach spec"));
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(
        result.unchanged ? "Spec is unchanged" : "Spec attached",
      );
      setOpen(false);
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["spec", serviceId] });
    },
    onError: (error) => toast.error(error.message),
  });

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    const content = await file.text();
    uploadSpec.mutate({ content });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="h-7">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach OpenAPI spec</DialogTitle>
          <DialogDescription>
            Swagger 2.0 or OpenAPI 3.x, JSON or YAML, up to 5 MB.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-xs">
          <FormFieldGroup>
            <FormFieldLabel htmlFor="spec-url">Spec URL</FormFieldLabel>
            <div className="flex gap-2">
              <Input
                id="spec-url"
                className={controlClassName}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.acme.com/openapi.json"
              />
              <Button
                className="h-8 shrink-0"
                disabled={uploadSpec.isPending || url.trim() === ""}
                onClick={() => uploadSpec.mutate({ url: url.trim() })}
              >
                {uploadSpec.isPending ? "Attaching…" : "Attach"}
              </Button>
            </div>
            <FormFieldHint id="spec-url-hint">
              URL-sourced specs can be re-synced later with one click.
            </FormFieldHint>
          </FormFieldGroup>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <FormFieldGroup>
            <FormFieldLabel htmlFor="spec-file">Upload a file</FormFieldLabel>
            <Input
              id="spec-file"
              ref={fileRef}
              type="file"
              accept=".json,.yaml,.yml,application/json"
              className={controlClassName}
              disabled={uploadSpec.isPending}
              onChange={(e) => onFileChange(e.target.files?.[0])}
            />
          </FormFieldGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}
