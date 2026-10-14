import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { ListEmpty, ListError } from "~/dashboard/components/list/list-states";

// The server signals "org not connected to the payroll provider" as PRECONDITION_FAILED.
// It takes a query's error, whose `data` the tRPC client has typed.
export function isNotConnectedError(
  error: { data?: { code: string } | null } | null,
): boolean {
  return error?.data?.code === "PRECONDITION_FAILED";
}

// A widget is the small case of the two list states: same words, same alert,
// less room. Both live in components/list/list-states.tsx.
function WidgetEmpty({ message }: { message: string }) {
  return (
    <ListEmpty
      size="compact"
      icon={<Inbox />}
      nothingYet={{ description: message }}
    />
  );
}

function WidgetError({
  message,
  onRetry,
  isRetrying,
}: {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <ListError
      size="compact"
      message={message}
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  );
}

export function WidgetState({
  isLoading,
  isError,
  isEmpty = false,
  emptyMessage,
  onRetry,
  isRetrying,
  skeleton,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  // When set, renders WidgetEmpty (with emptyMessage) instead of children.
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Refetches the widget's own query. */
  onRetry?: () => void;
  isRetrying?: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) return <>{skeleton}</>;
  if (isError) {
    return <WidgetError onRetry={onRetry} isRetrying={isRetrying} />;
  }
  if (isEmpty) {
    return <WidgetEmpty message={emptyMessage ?? "Nothing to show."} />;
  }
  return <>{children}</>;
}
