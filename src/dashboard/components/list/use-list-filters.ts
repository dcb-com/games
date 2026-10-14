/**
 * The state behind a list page's toolbar, in one place.
 *
 * A list page declares what it filters by (a search box, single-choice
 * menus, a date range, on/off flags) and gets back the values to send to the
 * server, a way to set or clear them, ready-made views, the column sort, and
 * the page in view. The search box waits for typing to pause on its own
 * (`FilterSearch` in `@dcb/ui/filter-bar`), so every value here settles the
 * moment it is set.
 *
 * - **One empty.** A filter is off when its value is `""`, `false`, or an
 *   empty range. There are no "all" sentinels: map one to `""` at the
 *   control.
 * - **Views.** A view is a named set of filter values. Picking one sets those
 *   values and clears every other filter but the search box; a view is
 *   active while the filters match it exactly.
 * - **One page.** The page and its length are in the address too, and a
 *   change to the filters or the sort goes back to the first page, since the
 *   rows behind it are no longer the same rows.
 * - **One sort mapping.** `sortInput` is `sorting[0]` as `{ sortBy, sortDir }`.
 * - **The address is the state.** Every filter and the sort live in the query
 *   string, so what a list is showing is always what its address says and any
 *   view of it is a link someone can send. A date range writes two keys,
 *   `<key>From` and `<key>To`, and the sort writes `sortBy` and `sortDir`. The
 *   page's route takes the same constant and validates those keys; see
 *   `list-search.ts`.
 *
 * ```ts
 * const list = useListFilters(
 *   {
 *     search: { kind: "search", label: "Search", placeholder: "Search by name" },
 *     role: { kind: "one", label: "Role", options: roleOptions },
 *     paid: { kind: "dateRange", label: "Paid" },
 *     mine: { kind: "flag", label: "Assigned to me" },
 *   },
 *   { filters: LIST_FILTERS, sort: { id: "name", desc: false } },
 * );
 * ```
 *
 * The functions below the hook are its whole logic, kept pure so they can be
 * tested without a browser. The hook itself only holds state.
 */

import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { functionalUpdate } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { useNavigate, useSearch } from "@tanstack/react-router";

import { PAGE_SIZE_OPTIONS } from "~/dashboard/components/data-table/table-pagination";
import type { RawSearch } from "~/dashboard/lib/search";
import { searchText, searchWholeNumber } from "~/dashboard/lib/search";

/** A pair of `YYYY-MM-DD` days. Either end may be empty, meaning "open". */
export interface DateRange {
  from: string;
  to: string;
}

/** A range open at both ends: no range at all. */
export const NO_RANGE: DateRange = { from: "", to: "" };

export interface FilterOption {
  value: string;
  label: string;
}

/** One filter a page declares. `label` names it for people, not for the URL. */
export type FilterSpec =
  | {
      kind: "search";
      /** Names the box for a screen reader: "Search administrators". */
      label: string;
      placeholder: string;
    }
  | {
      kind: "one";
      /** Names the filter on its button: "Status", "Policy". */
      label: string;
      options: readonly FilterOption[];
    }
  | {
      kind: "dateRange";
      /** Names the filter on its button: "Paid", "Exported". */
      label: string;
    }
  | {
      kind: "flag";
      /** Reads on the button: "Assigned to me". */
      label: string;
    };

export type FilterSpecs = Record<string, FilterSpec>;

export type FilterValue = string | boolean | DateRange;

type ValueFor<F extends FilterSpec> = F extends { kind: "dateRange" }
  ? DateRange
  : F extends { kind: "flag" }
    ? boolean
    : string;

export type FilterValues<S extends FilterSpecs> = {
  [K in keyof S]: ValueFor<S[K]>;
};

/** A ready-made search: a name, and the filter values it sets. */
export interface ListView<S extends FilterSpecs> {
  label: string;
  values: Partial<FilterValues<S>>;
  /** How many rows the view holds, when the page knows. */
  count?: number;
}

/** `sorting[0]`, in the shape the list procedures take. */
export interface SortInput {
  sortBy?: string;
  sortDir: "asc" | "desc";
}

export interface ListFilters<S extends FilterSpecs> {
  /** The specs as declared, for the controls in `list-toolbar.tsx`. */
  specs: S;
  /** The values the address holds: what the query input is built from. */
  values: FilterValues<S>;
  set: <K extends keyof S>(key: K, value: FilterValues<S>[K]) => void;
  /**
   * `set` by a key known only as text. The toolbar's controls use it: they
   * read the key's kind from `specs` and hand a value of that kind.
   */
  setNow: (key: string, value: FilterValue) => void;
  clear: (key: keyof S) => void;
  clearAll: () => void;
  isFiltered: boolean;
  /** True while the filters are exactly the ones this view sets. */
  isView: (view: ListView<S>) => boolean;
  applyView: (view: ListView<S>) => void;
  /** Changes whenever the filters or the sort change. */
  resetKey: string;
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
  sortInput: SortInput;
  /** The page in view, for the table. */
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  /** The same page, one-based, for the query that fetches it. */
  page: number;
  pageSize: number;
}

interface ListFilterOptions<S extends FilterSpecs> {
  /**
   * Every filter, with its kind. It is the same constant the page's route
   * hands `listSearch`, and every filter declared above has to appear here
   * with the kind it was given, so the keys the route validates and the keys
   * the page writes cannot drift apart. `NoInfer` is what makes that bite:
   * without it the specs are read from this list as well, and a filter left
   * out of it is simply a filter nobody declared.
   */
  filters: { [K in keyof NoInfer<S> & string]: NoInfer<S>[K]["kind"] };
  /** The column the list is sorted by until its address names another. */
  sort?: { id: string; desc: boolean };
  /** How long a page is until its address names another length. */
  pageSize?: number;
}

export function useListFilters<S extends FilterSpecs>(
  specs: S,
  opts: ListFilterOptions<S>,
): ListFilters<S> {
  // Kinds and keys are fixed for the life of the page, so they are read once.
  // Options and labels are read fresh every render, since a menu's options
  // usually arrive from a query.
  const [shape] = useState(() => shapeOf(specs));
  const [fallbackSort] = useState(() => opts.sort ?? null);
  const [fallbackPageSize] = useState(() => opts.pageSize ?? DEFAULT_PAGE_SIZE);

  // The route validates these keys and hands them back as text; anything else
  // in the address belongs to another part of the page and is left alone.
  const search: RawSearch = useSearch({ strict: false });
  const navigate = useNavigate();

  const values = useMemo(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- readValues reads each key by its spec's kind, which is FilterValues<S>; a mapped type cannot follow the loop
    () => readValues(shape, search) as FilterValues<S>,
    [shape, search],
  );

  const sorting = useMemo(
    () => readSorting(search, fallbackSort),
    [search, fallbackSort],
  );

  const pagination = useMemo(
    () => readPagination(search, fallbackPageSize),
    [search, fallbackPageSize],
  );

  // One write for the whole list: the keys handed in are merged over the
  // address, and a key with no value drops out of it.
  const write = useCallback(
    (next: Record<string, string | number | undefined>) => {
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, ...next }),
        replace: true,
      });
    },
    [navigate],
  );

  // A different set of rows means the page someone was on is a page of
  // something else, so every filter and sort change goes back to the first.
  const commit = useCallback(
    (next: Record<string, FilterValue>) =>
      write({ ...writeParams(shape, next), page: undefined }),
    [shape, write],
  );

  const setSorting = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      write({
        ...writeSorting(functionalUpdate(updater, sorting)),
        page: undefined,
      });
    },
    [sorting, write],
  );

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      write(
        writePagination(
          functionalUpdate(updater, pagination),
          fallbackPageSize,
        ),
      );
    },
    [pagination, fallbackPageSize, write],
  );

  const setNow = useCallback(
    (name: string, value: FilterValue) => commit({ [name]: value }),
    [commit],
  );

  const set = useCallback(
    <K extends keyof S>(key: K, value: FilterValues<S>[K]) =>
      setNow(String(key), value),
    [setNow],
  );

  const clear = useCallback(
    (key: keyof S) => {
      const name = String(key);
      setNow(name, emptyValue(shape[name] ?? "search"));
    },
    [shape, setNow],
  );

  const clearAll = useCallback(
    () => commit(emptyValues(shape)),
    [shape, commit],
  );

  const isView = useCallback(
    (view: ListView<S>) => isViewOf(shape, values, view.values),
    [shape, values],
  );

  const applyView = useCallback(
    (view: ListView<S>) => commit(viewValuesOf(shape, values, view.values)),
    [shape, values, commit],
  );

  const sortInput = useMemo(() => sortInputOf(sorting), [sorting]);

  return {
    specs,
    values,
    set,
    setNow,
    clear,
    clearAll,
    isFiltered: isFilteredOf(values),
    isView,
    applyView,
    resetKey: resetKeyOf(values, sortInput),
    sorting,
    setSorting,
    sortInput,
    pagination,
    onPaginationChange,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };
}

// --- the pure core, tested in use-list-filters.test.ts ------------------

export type FilterKind = FilterSpec["kind"];
type FilterShape = Record<string, FilterKind>;

/** Just the kinds: everything the state handling needs, and nothing that moves. */
export function shapeOf(specs: FilterSpecs): FilterShape {
  const out: FilterShape = {};
  for (const [key, spec] of Object.entries(specs)) out[key] = spec.kind;
  return out;
}

/** The value a filter holds when it is off. */
export function emptyValue(kind: FilterKind): FilterValue {
  if (kind === "flag") return false;
  if (kind === "dateRange") return { from: "", to: "" };
  return "";
}

export function emptyValues(shape: FilterShape): Record<string, FilterValue> {
  const out: Record<string, FilterValue> = {};
  for (const [key, kind] of Object.entries(shape)) out[key] = emptyValue(kind);
  return out;
}

/** A search or single-choice value as text; anything else has no text form. */
export function asText(value: FilterValue | undefined): string {
  return typeof value === "string" ? value : "";
}

/** True when this one filter is doing nothing. */
export function isEmpty(value: FilterValue): boolean {
  if (typeof value === "boolean") return !value;
  if (typeof value === "string") return value === "";
  return value.from === "" && value.to === "";
}

export function isFilteredOf(values: Record<string, FilterValue>): boolean {
  return Object.values(values).some((value) => !isEmpty(value));
}

function sameValue(a: FilterValue, b: FilterValue): boolean {
  if (typeof a === "object" && typeof b === "object") {
    return a.from === b.from && a.to === b.to;
  }
  return a === b;
}

/**
 * True while every filter but the search box holds what the view sets, and
 * the filters the view leaves out are off.
 */
export function isViewOf(
  shape: FilterShape,
  values: Record<string, FilterValue>,
  view: Record<string, FilterValue | undefined>,
): boolean {
  return Object.entries(shape).every(([key, kind]) => {
    if (kind === "search") return true;
    const want = view[key] ?? emptyValue(kind);
    return sameValue(values[key] ?? emptyValue(kind), want);
  });
}

/** The filters a view sets: its own values, the search kept, the rest off. */
export function viewValuesOf(
  shape: FilterShape,
  values: Record<string, FilterValue>,
  view: Record<string, FilterValue | undefined>,
): Record<string, FilterValue> {
  const out: Record<string, FilterValue> = {};
  for (const [key, kind] of Object.entries(shape)) {
    out[key] =
      kind === "search"
        ? (values[key] ?? emptyValue(kind))
        : (view[key] ?? emptyValue(kind));
  }
  return out;
}

/** The filters as the address has them; a key it lacks is a filter that is off. */
export function readValues(
  shape: FilterShape,
  search: RawSearch,
): Record<string, FilterValue> {
  const out: Record<string, FilterValue> = {};
  for (const [key, kind] of Object.entries(shape)) {
    out[key] = readParam(key, kind, search);
  }
  return out;
}

/**
 * The sorted column the address names, or the one the page starts on. A
 * direction on its own sorts nothing, so `sortBy` is what decides.
 */
export function readSorting(
  search: RawSearch,
  fallback: { id: string; desc: boolean } | null,
): SortingState {
  const sortBy = searchText(search.sortBy);
  if (!sortBy) return fallback ? [fallback] : [];
  return [{ id: sortBy, desc: searchText(search.sortDir) !== "asc" }];
}

/** How long a page is when its address does not say. */
const DEFAULT_PAGE_SIZE = 20;

/**
 * The page the address names. Page one and the usual page length are what an
 * address with nothing to say about paging means.
 */
export function readPagination(
  search: RawSearch,
  fallbackPageSize: number,
): PaginationState {
  return {
    pageIndex: (searchWholeNumber(search.page) ?? 1) - 1,
    pageSize:
      searchWholeNumber(search.pageSize, PAGE_SIZE_OPTIONS) ?? fallbackPageSize,
  };
}

/** That page as keys for the address, leaving out what an address implies. */
export function writePagination(
  pagination: PaginationState,
  fallbackPageSize: number,
): Record<string, number | undefined> {
  return {
    page: pagination.pageIndex === 0 ? undefined : pagination.pageIndex + 1,
    pageSize:
      pagination.pageSize === fallbackPageSize
        ? undefined
        : pagination.pageSize,
  };
}

/** That column as keys for the address. No column clears both keys. */
export function writeSorting(
  sorting: SortingState,
): Record<string, string | undefined> {
  const first = sorting[0];
  if (!first) return { sortBy: undefined, sortDir: undefined };
  return { sortBy: first.id, sortDir: first.desc ? "desc" : "asc" };
}

function readParam(
  key: string,
  kind: FilterKind,
  search: RawSearch,
): FilterValue {
  const text = (name: string) => searchText(search[name]) ?? "";
  if (kind === "flag") {
    const raw = text(key);
    return raw === "1" || raw === "true";
  }
  if (kind === "dateRange") {
    return { from: text(`${key}From`), to: text(`${key}To`) };
  }
  return text(key);
}

/**
 * These filters as keys for the address. A filter that is off is `undefined`,
 * which the router drops, so a clean list has a clean address. Only the keys
 * the filters own appear: the caller merges this onto what is already there,
 * and anything else in the address is left alone.
 */
export function writeParams(
  shape: FilterShape,
  values: Record<string, FilterValue>,
): Record<string, string | undefined> {
  const next: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    const kind = shape[key] ?? "one";
    if (kind === "dateRange") {
      const range = typeof value === "object" ? value : NO_RANGE;
      next[`${key}From`] = written(range.from);
      next[`${key}To`] = written(range.to);
      continue;
    }
    if (kind === "flag") {
      next[key] = value === true ? "1" : undefined;
      continue;
    }
    next[key] = written(asText(value));
  }
  return next;
}

// An empty value is no key at all, not a key with nothing behind it.
function written(value: string): string | undefined {
  return value === "" ? undefined : value;
}

/**
 * One sorted column at a time. A column sorted ascending says so; anything
 * else, including no sort at all, reads as descending.
 */
export function sortInputOf(sorting: SortingState): SortInput {
  const first = sorting[0];
  return {
    sortBy: first?.id,
    sortDir: first?.desc === false ? "asc" : "desc",
  };
}

/**
 * A string that changes whenever the list the table is showing changes, so
 * paging can fall back to page 1. Keys are sorted, so the same filters always
 * give the same key.
 */
export function resetKeyOf(
  values: Record<string, FilterValue>,
  sort: SortInput,
): string {
  const ordered = Object.keys(values)
    .sort()
    .map((key) => [key, values[key]] as const);
  return JSON.stringify([ordered, sort.sortBy ?? "", sort.sortDir]);
}
