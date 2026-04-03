import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Lightweight scroll area component following shadcn pattern.
 * Created manually (consistent with Phase 5 decision for Textarea/Input/Label).
 * Uses native overflow with styled scrollbar CSS.
 */
const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" | "both" }
>(({ className, orientation = "vertical", children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative",
      orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
      orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
      orientation === "both" && "overflow-auto",
      // Styled scrollbar
      "scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
