import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

import { cn } from "@dcb/ui";

// A boxed notice. Each tone is one of the theme's status triples, so the
// background, the text and the border always come from the same family.
export const alertVariants = cva(
  "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
  {
    variants: {
      tone: {
        info: "bg-accent text-accent-foreground border-border",
        warning: "bg-warning text-warning-foreground border-warning-border",
        success: "bg-success text-success-foreground border-success-border",
        destructive:
          "bg-destructive-soft text-destructive-soft-foreground border-destructive-soft-border",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

/**
 * Compose it as:
 *
 *   <Alert tone="warning">
 *     <AlertIcon><TriangleAlert /></AlertIcon>
 *     <AlertContent>
 *       <AlertTitle>No pay schedule</AlertTitle>
 *       <AlertDescription>Pick one before you run payroll.</AlertDescription>
 *     </AlertContent>
 *     <AlertActions>
 *       <Button size="sm" variant="outline">Fix in settings</Button>
 *     </AlertActions>
 *   </Alert>
 *
 * A one-line banner can skip AlertContent and pass the text straight in.
 */
export function Alert({
  className,
  tone = "info",
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-tone={tone}
      // A warning or an error interrupts; news that can wait is announced politely.
      role={
        role ??
        (tone === "warning" || tone === "destructive" ? "alert" : "status")
      }
      className={cn(alertVariants({ tone }), className)}
      {...props}
    />
  );
}

// Holds one lucide icon. lucide marks its icons aria-hidden already; the
// wrapper repeats it so a plain <svg> passed in is hidden too.
export function AlertIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="alert-icon"
      aria-hidden="true"
      className={cn(
        "mt-0.5 shrink-0 [&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export function AlertContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn("font-medium", className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("[&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

// The right-hand side of a banner: "Fix in settings", "Retry", "Dismiss".
export function AlertActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-actions"
      className={cn("ml-auto flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}
