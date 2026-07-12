import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { servicesQueryOptions } from "@/features/services/queries";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";

type HeaderBreadcrumb = {
  label: string;
  href?: string;
  serviceId?: string;
};

type DashboardHeaderProps = {
  breadcrumbs: HeaderBreadcrumb[];
  actions?: ReactNode;
};

function ServiceCrumb({
  serviceId,
  label,
}: {
  serviceId: string;
  label: string;
}) {
  const navigate = useNavigate();
  const servicesQuery = useQuery(servicesQueryOptions);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        <span className="truncate">{label}</span>
        <CaretUpDownIcon className="size-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {(servicesQuery.data ?? []).map((service) => (
          <DropdownMenuItem
            key={service.id}
            onSelect={() => {
              if (service.id === serviceId) {
                return;
              }
              void navigate({
                to: ".",
                params: (prev) => ({ ...prev, serviceId: service.id }),
              });
            }}
          >
            <span className="min-w-0 flex-1 truncate">{service.name}</span>
            {service.id === serviceId ? (
              <CheckIcon className="size-3.5 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardHeader({
  breadcrumbs,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 bg-background px-3">
      <SidebarTrigger className="md:hidden" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap gap-1.5">
          {breadcrumbs.map((item, index) => {
            const isCurrent = index === breadcrumbs.length - 1;

            return (
              <Fragment key={item.label}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem>
                  {item.serviceId ? (
                    <ServiceCrumb
                      serviceId={item.serviceId}
                      label={item.label}
                    />
                  ) : isCurrent ? (
                    <BreadcrumbPage className="truncate">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href} className="truncate">
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      {actions ? (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
