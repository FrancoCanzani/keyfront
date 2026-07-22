import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { copyToClipboard } from "@/lib/utils";
import { CopyIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { type SyntheticEvent, useState } from "react";
import { toast } from "sonner";
import { linksQueryOptions, useCreateLink, useDeleteLink } from "./queries";

export function LinksPage() {
  const linksQuery = useQuery(linksQueryOptions);
  const createLink = useCreateLink();
  const deleteLink = useDeleteLink();
  const [url, setUrl] = useState("");

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createLink.mutateAsync({ url });
      setUrl("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create link",
      );
    }
  }

  async function copy(key: string) {
    await copyToClipboard(`${window.location.origin}/r/${key}`);
    toast.success("Copied");
  }

  return (
    <div className="py-10">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="url"
          required
          autoFocus
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a URL"
          className="flex-1 h-8"
        />
        <Button
          type="submit"
          variant={"outline"}
          size={"sm"}
          disabled={createLink.isPending}
        >
          Shorten
        </Button>
      </form>

      <div className="mt-8">
        {linksQuery.data?.length ? (
          <ul className="divide-y">
            {linksQuery.data.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <a
                    href={`/r/${row.key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium"
                  >
                    {window.location.host}/r/{row.key}
                  </a>
                  <p className="truncate text-sm text-muted-foreground">
                    {row.url}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
                  <span className="text-xs tabular-nums">{row.clicks}</span>
                  <button
                    type="button"
                    aria-label="Copy"
                    onClick={() => void copy(row.key)}
                    className="hover:text-foreground"
                  >
                    <CopyIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() => deleteLink.mutate(row.id)}
                    className="hover:text-foreground"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            <EmptyTitle>No links yet</EmptyTitle>
            <EmptyDescription>
              Shorten a URL above to see it here.
            </EmptyDescription>
          </Empty>
        )}
      </div>
    </div>
  );
}
