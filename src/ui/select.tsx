import { ChevronDownIcon } from "lucide-react";

import { cn } from "@dcb/ui";
import { fieldControlClassName } from "@dcb/ui/field-control";

// className styles the wrapper, not the select; pass `w-full` to fill the container.
export function Select({
  className,
  children,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
  ...props
}: React.ComponentProps<"select"> & {
  className?: string;
  "data-invalid"?: boolean;
}) {
  // Same pair as Input: either prop marks the field, both land on the select.
  const invalid = ariaInvalid ?? (dataInvalid ? true : undefined);

  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        data-slot="select"
        aria-invalid={invalid}
        data-invalid={dataInvalid}
        className={cn(
          fieldControlClassName,
          "appearance-none py-2 pr-9 pl-3 text-sm",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  );
}
