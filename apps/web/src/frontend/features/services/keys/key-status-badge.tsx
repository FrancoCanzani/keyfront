type KeyStatus = {
  status: string;
  enabled: boolean;
};

export function KeyStatusBadge({ status, enabled }: KeyStatus) {
  if (status !== "active") {
    return (
      <span className="inline-flex rounded px-1.5 py-0.5 font-data text-xxs capitalize text-muted-foreground line-through">
        {status}
      </span>
    );
  }

  if (enabled) {
    return (
      <span className="inline-flex rounded bg-[#15803d]/10 px-1.5 py-0.5 font-data text-xxs text-[#15803d]">
        active
      </span>
    );
  }

  return (
    <span className="inline-flex rounded bg-[#ec835a]/10 px-1.5 py-0.5 font-data text-xxs text-[#ec835a]">
      paused
    </span>
  );
}

export function EnvironmentBadge({ environment }: { environment: string }) {
  if (environment !== "test") return null;

  return (
    <span className="inline-flex rounded border border-border bg-muted/40 px-1.5 py-0.5 font-data text-xxs text-muted-foreground">
      test
    </span>
  );
}
