import type { ReactNode } from "react";

import { cn } from "@dcb/ui";

// `align="start"` is for finalize, whose forward action (the irreversible
// submit) lives in the page body, not this bar.
export function StepFooter({
  align = "end",
  children,
}: {
  align?: "end" | "between" | "start";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border flex shrink-0 items-center gap-2 border-t px-4 py-3 md:px-6",
        align === "between"
          ? "justify-between"
          : align === "start"
            ? "justify-start"
            : "justify-end",
      )}
    >
      {children}
    </div>
  );
}
