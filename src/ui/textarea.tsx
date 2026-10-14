import { cn } from "@dcb/ui";
import { fieldControlClassName } from "@dcb/ui/field-control";

// A text box of several lines. It wears the same surface as Input and
// grows with what is typed.
export function Textarea({
  className,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
  ...props
}: React.ComponentProps<"textarea"> & { "data-invalid"?: boolean }) {
  const invalid = ariaInvalid ?? (dataInvalid ? true : undefined);

  return (
    <textarea
      data-slot="textarea"
      aria-invalid={invalid}
      data-invalid={dataInvalid}
      className={cn(
        fieldControlClassName,
        "placeholder:text-muted-foreground/70 field-sizing-content h-auto min-h-24 px-4 py-3 text-base md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
