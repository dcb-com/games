import { cn } from "@dcb/ui";

// Shared surface styling for Input, Select, and DatePicker; layout stays with each component.
export const fieldControlClassName = cn(
  "border-input bg-secondary text-foreground h-9 w-full rounded-lg border transition-[color,border-color,box-shadow] outline-none",
  "focus-visible:border-primary focus-visible:ring-ring/20 focus-visible:ring-4",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);
