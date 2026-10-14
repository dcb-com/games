import { cn } from "@dcb/ui";

// A gray box standing in for content. It says nothing to a screen reader;
// wrap a group of them in SkeletonGroup so the wait is announced once.
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export function SkeletonGroup({
  className,
  children,
  label = "Loading",
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  return (
    <div
      data-slot="skeleton-group"
      role="status"
      aria-busy="true"
      className={cn(className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
