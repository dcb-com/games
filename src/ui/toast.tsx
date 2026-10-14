"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

export { toast };
export type { ExternalToast, ToasterProps } from "sonner";

/**
 * Mounted once, next to the app's providers. Call `toast.success("Saved")`
 * (or .error / .message / .promise) from anywhere.
 *
 * `unstyled` turns off sonner's own stylesheet so every color, radius and
 * shadow below comes from the theme. Sonner ships its CSS unlayered, which
 * would otherwise beat Tailwind's utility layer.
 */
export function Toaster({
  position = "bottom-right",
  toastOptions,
  ...props
}: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      position={position}
      richColors={false}
      toastOptions={{
        unstyled: true,
        ...toastOptions,
        classNames: {
          toast:
            "bg-popover text-popover-foreground border-border flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg",
          title: "text-sm font-medium",
          description: "text-muted-foreground text-sm",
          icon: "mt-0.5 flex shrink-0 [&>svg]:size-4",
          content: "flex min-w-0 flex-1 flex-col gap-1",
          actionButton:
            "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/40 ml-auto shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus-visible:ring-4",
          cancelButton:
            "bg-secondary text-secondary-foreground hover:bg-secondary/70 focus-visible:ring-ring/40 shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus-visible:ring-4",
          closeButton:
            "bg-popover text-muted-foreground hover:text-foreground border-border focus-visible:ring-ring/40 rounded-full border outline-none focus-visible:ring-4",
          // The type tints only the icon; the card itself stays neutral.
          error: "[&_[data-icon]]:text-destructive-soft-foreground",
          success: "[&_[data-icon]]:text-success-foreground",
          warning: "[&_[data-icon]]:text-warning-foreground",
          info: "[&_[data-icon]]:text-accent-foreground",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
}
