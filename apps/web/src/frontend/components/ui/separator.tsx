"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "solid",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  variant?: "solid" | "dashed"
}) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-variant={variant}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 data-vertical:self-stretch",
        variant === "solid" &&
          "bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px",
        variant === "dashed" &&
          "bg-transparent data-horizontal:h-0 data-horizontal:w-full data-horizontal:border-t data-horizontal:border-dashed data-horizontal:border-border data-vertical:h-full data-vertical:w-0 data-vertical:border-l data-vertical:border-dashed data-vertical:border-border",
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
