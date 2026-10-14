import { cn } from "@dcb/ui";
import { fieldControlClassName } from "@dcb/ui/field-control";

export function Input({
  className,
  type,
  "aria-invalid": ariaInvalid,
  "data-invalid": dataInvalid,
  ...props
}: React.ComponentProps<"input"> & { "data-invalid"?: boolean }) {
  // Either prop marks the field: `data-invalid` reads better next to a form
  // library's flag, `aria-invalid` is what the screen reader hears. Both end
  // up on the element, so the invalid styles in fieldControlClassName apply.
  const invalid = ariaInvalid ?? (dataInvalid ? true : undefined);

  return (
    <input
      type={type}
      data-slot="input"
      aria-invalid={invalid}
      data-invalid={dataInvalid}
      className={cn(
        fieldControlClassName,
        "placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground flex min-w-0 px-4 py-2 text-base file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
