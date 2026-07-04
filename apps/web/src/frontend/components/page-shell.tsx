import type { ReactNode } from "react";

export function PageShell({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:py-10">
        {children}
      </div>
    </div>
  );
}
