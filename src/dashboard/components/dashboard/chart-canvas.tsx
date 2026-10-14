import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "@dcb/ui";

// Defaults to the standard chart height; pass `className` to override sizing.
export function ChartCanvas({
  className,
  children,
}: {
  className?: string;
  children: ReactElement;
}) {
  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
