import { Button } from "@/components/ui/button";
import { CopyRow } from "@/components/copy-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={service !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Service created</DialogTitle>
          <DialogDescription>
            Save the gateway secret now. You won't be able to see it again.
          </DialogDescription>
        </DialogHeader>

        {service ? (
          <div className="space-y-4">
            <CopyRow label="Gateway URL" value={`https://${service.host}`} />
            <CopyRow label="Gateway secret" value={service.secret} />
            <p className="text-xs leading-5 text-muted-foreground">
              Every request forwarded to {service.upstream} carries this secret
              in the{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">
                X-Gateway-Secret
              </code>{" "}
              header. Reject requests without it.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
