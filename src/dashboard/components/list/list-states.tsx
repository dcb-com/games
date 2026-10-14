import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import { cn } from "@dcb/ui";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
} from "@dcb/ui/alert";
import { Button } from "@dcb/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dcb/ui/empty";

/** What the list holds. The plural writes the title. */
interface ListNoun {
  /** "invoice". Kept for callers that also name a single row. */
  one?: string;
  /** "invoices". */
  many: string;
}

/** The one sentence every filtered list says. */
export const FILTERED_EMPTY_DESCRIPTION =
  "Nothing here fits the search and filters above.";

/** The one label on the control that clears a filtered empty state. */
export const CLEAR_FILTERS_LABEL = "Clear filters";

/**
 * Empty titles are generated, never typed, so every list says the same
 * sentence: "No invoices yet" and "No invoices match these filters". A
 * search box that asked a query gets that query echoed back instead:
 * "No invoices match “zzzznotfound”".
 */
export function emptyTitle(
  noun: ListNoun,
  filtered = false,
  query?: string,
): string {
  if (!filtered) return `No ${noun.many} yet`;
  const trimmedQuery = query?.trim();
  return trimmedQuery
    ? `No ${noun.many} match “${trimmedQuery}”`
    : `No ${noun.many} match these filters`;
}

interface ListEmptyProps {
  /** A lucide icon element, such as `<ReceiptText />`. */
  icon?: ReactNode;
  /** True while a search, a filter or a date range narrows the list. */
  filtered?: boolean;
  /** Writes the title. Leave it out for a strip with no title, such as a widget. */
  noun?: ListNoun;
  /** The search text, when the empty state came from a search box. Echoed into the title. */
  query?: string;
  /** What to say, and what to offer, when the list is empty for everyone. */
  nothingYet?: { description?: ReactNode; action?: ReactNode };
  /** Replaces the standard filtered sentence. Rarely needed. */
  filteredDescription?: ReactNode;
  /** Clears the search and the filters. The only control shown while filtered. */
  onClearFilters?: () => void;
  /** "compact" is the widget size: quieter icon, less padding. */
  size?: "page" | "compact";
  className?: string;
}

/**
 * The two-branch empty state: nothing yet, or nothing that matches. The title
 * comes from the noun, the filtered sentence is fixed, and the clear control is
 * always an outline button labelled "Clear filters".
 */
export function ListEmpty({
  icon,
  filtered = false,
  noun,
  query,
  nothingYet,
  filteredDescription = FILTERED_EMPTY_DESCRIPTION,
  onClearFilters,
  size = "page",
  className,
}: ListEmptyProps) {
  const compact = size === "compact";
  const title = noun ? emptyTitle(noun, filtered, query) : null;
  const description = filtered ? filteredDescription : nothingYet?.description;
  const action: ReactNode = filtered
    ? onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          {CLEAR_FILTERS_LABEL}
        </Button>
      )
    : nothingYet?.action;

  return (
    <Empty className={cn(compact && "gap-2 py-6", className)}>
      <EmptyHeader>
        {icon && (
          <EmptyMedia variant={compact ? "muted" : "icon"}>{icon}</EmptyMedia>
        )}
        {title && <EmptyTitle>{title}</EmptyTitle>}
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

interface ListErrorProps {
  message?: string;
  /** Refetches the query behind the list. */
  onRetry?: () => void;
  isRetrying?: boolean;
  /** "compact" is the widget size. */
  size?: "page" | "compact";
  className?: string;
}

/**
 * A failure looks nothing like an empty list, and it offers the one thing that
 * helps: asking again.
 */
export function ListError({
  message,
  onRetry,
  isRetrying,
  size = "page",
  className,
}: ListErrorProps) {
  return (
    <Alert
      tone="destructive"
      className={cn(
        "flex-col items-start gap-2",
        size === "compact" ? "my-2" : "my-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertIcon>
          <TriangleAlert />
        </AlertIcon>
        <AlertContent>
          <AlertDescription>
            {message ?? "We couldn’t load this."}
          </AlertDescription>
        </AlertContent>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? "Retrying…" : "Retry"}
        </Button>
      )}
    </Alert>
  );
}
