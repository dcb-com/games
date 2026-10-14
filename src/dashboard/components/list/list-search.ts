import { PAGE_SIZE_OPTIONS } from "~/dashboard/components/data-table/table-pagination";
import type { FilterKind } from "~/dashboard/components/list/use-list-filters";
import type { RawSearch } from "~/dashboard/lib/search";
import { searchText, searchWholeNumber } from "~/dashboard/lib/search";

/**
 * Every filter on a list page, and the kind of each one.
 *
 * A page declares this once. Its route turns it into `validateSearch`, and the
 * page hands the same constant to `useListFilters`, so the keys the route
 * validates and the keys the page writes are the same keys by construction.
 */
export type ListFilterKinds = Readonly<Record<string, FilterKind>>;

/** The column a list is sorted by, which travels with its filters. */
interface SortSearch {
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/** Which page of the list is in view, and how long a page is. */
interface PageSearch {
  page?: string;
  pageSize?: string;
}

/**
 * The keys a list page keeps in its address: one for each filter, two for a
 * date range (`<key>From` and `<key>To`), the sort, and the page. All
 * optional, so a filter that is off has no key at all, the first page and the
 * usual page length leave none behind, and a link to the page needs no search.
 */
type ListSearch<F extends ListFilterKinds> = {
  [
    K in keyof F & string as F[K] extends "dateRange"
      ? `${K}From` | `${K}To`
      : K
  ]?: string;
} & SortSearch &
  PageSearch;

/**
 * The `validateSearch` for a list page.
 *
 * ```ts
 * export const Route = createFileRoute("/_session/_admin/invoices/")({
 *   validateSearch: listSearch(INVOICE_FILTERS),
 *   component: InvoicesPage,
 * });
 * ```
 *
 * Everything reads as text. The router parses a query string with a JSON-aware
 * reader, so a value that is all digits arrives as a number and has to be read
 * back as text before a page sees it; see `searchText`. A key with nothing
 * behind it is dropped rather than kept as an empty one.
 */
export function listSearch<const F extends ListFilterKinds>(filters: F) {
  const keys = searchKeysOf(filters);
  return (search: RawSearch): ListSearch<F> => {
    const out: Record<string, string | undefined> = {};
    for (const key of keys) {
      const text = searchText(search[key]);
      if (text) out[key] = text;
    }
    // A direction on its own sorts nothing, so it only counts with a column.
    const sortBy = searchText(search.sortBy);
    if (sortBy) {
      out.sortBy = sortBy;
      out.sortDir = searchText(search.sortDir) === "asc" ? "asc" : "desc";
    }
    // The first page is the page an address with nothing to say about paging
    // means, and so is the usual page length.
    const page = searchWholeNumber(search.page);
    if (page && page > 1) out.page = String(page);
    const pageSize = searchWholeNumber(search.pageSize, PAGE_SIZE_OPTIONS);
    if (pageSize) out.pageSize = String(pageSize);
    return out;
  };
}

/** Every key the filters occupy, in the order they were declared. */
export function searchKeysOf(filters: ListFilterKinds): string[] {
  return Object.entries(filters).flatMap(([key, kind]) =>
    kind === "dateRange" ? [`${key}From`, `${key}To`] : [key],
  );
}
