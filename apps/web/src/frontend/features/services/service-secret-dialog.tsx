import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

type ServiceSecret = {
  host: string;
  upstream: string;
  secret: string;
};

export function ServiceSecretDialog({
  service,
  onClose,
}: {
  service: ServiceSecret | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    if (!service) {
      return;
    }
    await navigator.clipboard.writeText(service.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={service !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Service created</DialogTitle>
          <DialogDescription>
            Copy your gateway secret now. You won't be able to see it again.
          </DialogDescription>
        </DialogHeader>

        {service ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Point your clients at
              </p>
              <code className="block rounded-md bg-muted px-3 py-2 text-sm">
                https://{service.host}
              </code>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Every request we forward to your origin carries this header.
                Reject requests without it.
              </p>
              <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs leading-6">
                <span className="text-muted-foreground">curl </span>
                {service.upstream}
                {" \\"}
                {"\n  "}
                <span className="text-muted-foreground">-H </span>
                {'"X-Gateway-Secret: '}
                <span className="rounded bg-primary/15 px-1 font-medium text-foreground">
                  {service.secret}
                </span>
                {'"'}
              </pre>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => void copySecret()}
          >
            {copied ? "Copied" : "Copy secret"}
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
