/**
 * The row of controls above a list, built from the shared filter bar
 * (`@dcb/ui/filter-bar`) so every list in the dashboard filters the way the
 * People page does: a row of ready-made views, then one search box and a
 * small "Label Value" menu per filter, and "Clear all" while anything
 * narrows the list.
 *
 * ```tsx
 * <ListToolbar filters={list} views={VIEWS}>
 *   <SelectFilter filters={list} name="role" />
 *   <DateRangeFilter filters={list} name="paid" />
 *   <FlagFilter filters={list} name="mine" />
 * </ListToolbar>
 * ```
 *
 * `SelectFilter`, `DateRangeFilter` and `FlagFilter` read their label,
 * options and value from the spec the page already declared. A page that
 * needs something else passes it as a child and calls `list.set` itself.
 *
 * Where things sit: the page's main action goes in `PageHeader actions`, not
 * here; `actions` is for a control that acts on the filtered list, such as an
 * export.
 */

import { useState } from "react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import { DatePicker } from "@dcb/ui/date-picker";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@dcb/ui/dropdown-menu";
import {
  ChoiceFilter,
  FilterMenu,
  FilterSearch,
  FilterView,
} from "@dcb/ui/filter-bar";

import { asText, NO_RANGE } from "~/dashboard/components/list/use-list-filters";
import type {
  DateRange,
  FilterKind,
  FilterSpecs,
  FilterValue,
  ListFilters,
  ListView,
} from "~/dashboard/components/list/use-list-filters";
import { fmtDate } from "~/dashboard/lib/format";

/** The keys of the filters a control can drive: `name` never takes a wrong one. */
type KeysOfKind<S extends FilterSpecs, K extends FilterKind> = Extract<
  {
    [P in keyof S]: S[P] extends { kind: K } ? P : never;
  }[keyof S],
  string
>;

export function ListToolbar<S extends FilterSpecs>({
  filters,
  views,
  actions,
  children,
  className,
}: {
  filters: ListFilters<S>;
  /** Ready-made searches, shown as a row of tabs above the filters. */
  views?: readonly ListView<S>[];
  /** A control that acts on the filtered list, pinned to the right. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const searchKey = Object.keys(filters.specs).find(
    (key) => filters.specs[key]?.kind === "search",
  );
  const search = searchKey ? filters.specs[searchKey] : undefined;

  return (
    <div
      className={cn("mb-3 flex flex-col gap-3", className)}
      data-slot="list-toolbar"
    >
      {views && views.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Views">
          {views.map((view) => (
            <FilterView
              key={view.label}
              active={filters.isView(view)}
              onClick={() => filters.applyView(view)}
            >
              {view.label}
              {view.count !== undefined && (
                <span className="tabular-nums opacity-70">{view.count}</span>
              )}
            </FilterView>
          ))}
        </div>
      )}

      <div className="flex flex-col items-start gap-2 sm:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {searchKey && search?.kind === "search" && (
            <FilterSearch
              live
              value={asText(filters.values[searchKey])}
              onChange={(next) => filters.setNow(searchKey, next)}
              placeholder={search.placeholder}
              label={search.label}
              className="sm:w-60"
            />
          )}
          {children}
          {filters.isFiltered && (
            <Button variant="ghost" size="xs" onClick={filters.clearAll}>
              Clear all
            </Button>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** A single-choice filter: "Policy Any", "Status Paid". */
export function SelectFilter<S extends FilterSpecs>({
  filters,
  name,
}: {
  filters: ListFilters<S>;
  name: KeysOfKind<S, "one">;
}) {
  const spec = filters.specs[name];
  if (spec?.kind !== "one") return null;

  const value = asText(filters.values[name]);
  return (
    <ChoiceFilter
      label={spec.label}
      values={spec.options.map((o) => o.value)}
      words={Object.fromEntries(spec.options.map((o) => [o.value, o.label]))}
      value={value === "" ? undefined : value}
      onChange={(next) => filters.setNow(name, next ?? "")}
    />
  );
}

// Ready-made ranges, counted back from today.
type Preset = "30d" | "90d" | "year" | "lastYear";

const PRESETS: readonly Preset[] = ["30d", "90d", "year", "lastYear"];

const PRESET_WORDS: Record<Preset, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  year: "This year",
  lastYear: "Last year",
};

function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function presetRange(preset: Preset, today = new Date()): DateRange {
  const year = today.getFullYear();
  const daysBack = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return isoDay(d);
  };
  if (preset === "30d") return { from: daysBack(30), to: "" };
  if (preset === "90d") return { from: daysBack(90), to: "" };
  if (preset === "year") return { from: `${year}-01-01`, to: "" };
  return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
}

function presetOf(range: DateRange): Preset | undefined {
  return PRESETS.find((p) => {
    const r = presetRange(p);
    return r.from === range.from && r.to === range.to;
  });
}

/** The range in words, short enough for the filter's button. */
function rangeWords(range: DateRange): string {
  const preset = presetOf(range);
  if (preset) return PRESET_WORDS[preset];
  if (range.from && range.to) {
    return `${fmtDate(range.from)} to ${fmtDate(range.to)}`;
  }
  if (range.from) return `From ${fmtDate(range.from)}`;
  if (range.to) return `Until ${fmtDate(range.to)}`;
  return "Any time";
}

/**
 * Two days, either of which may be left open: a menu of ready-made ranges,
 * and "Pick days" for two date pickers of its own.
 */
export function DateRangeFilter<S extends FilterSpecs>({
  filters,
  name,
}: {
  filters: ListFilters<S>;
  name: KeysOfKind<S, "dateRange">;
}) {
  const spec = filters.specs[name];
  const value: FilterValue | undefined = filters.values[name];
  const range = typeof value === "object" ? value : NO_RANGE;
  const preset = presetOf(range);
  const set = range.from !== "" || range.to !== "";
  const custom = set && !preset;
  const [picking, setPicking] = useState(custom);

  if (spec?.kind !== "dateRange") return null;

  const choose = (next: DateRange) => filters.setNow(name, next);

  return (
    <>
      <FilterMenu label={spec.label} value={rangeWords(range)} active={set}>
        <DropdownMenuRadioGroup
          value={picking || custom ? "pick" : (preset ?? "any")}
          onValueChange={(v) => {
            if (v === "pick") {
              setPicking(true);
              return;
            }
            setPicking(false);
            const picked = PRESETS.find((p) => p === v);
            choose(picked ? presetRange(picked) : NO_RANGE);
          }}
        >
          <DropdownMenuRadioItem value="any">Any time</DropdownMenuRadioItem>
          {PRESETS.map((p) => (
            <DropdownMenuRadioItem key={p} value={p}>
              {PRESET_WORDS[p]}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuRadioItem value="pick">Pick days</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </FilterMenu>
      {(picking || custom) && (
        <div
          role="group"
          aria-label={`${spec.label} between two days`}
          className="flex items-center gap-1.5"
        >
          <DatePicker
            value={range.from}
            placeholder="From"
            className="h-7 w-32 rounded-md px-2.5 text-xs"
            onChange={(from) => choose({ ...range, from })}
          />
          <span className="type-caption">to</span>
          <DatePicker
            value={range.to}
            placeholder="To"
            className="h-7 w-32 rounded-md px-2.5 text-xs"
            onChange={(to) => choose({ ...range, to })}
          />
        </div>
      )}
    </>
  );
}

/** An on/off filter, shown as a small button that stays pressed while on. */
export function FlagFilter<S extends FilterSpecs>({
  filters,
  name,
}: {
  filters: ListFilters<S>;
  name: KeysOfKind<S, "flag">;
}) {
  const spec = filters.specs[name];
  if (spec?.kind !== "flag") return null;
  const on = filters.values[name] === true;

  return (
    <Button
      size="xs"
      variant={on ? "secondary" : "outline"}
      className={cn("font-medium", on && "text-primary")}
      aria-pressed={on}
      onClick={() => filters.setNow(name, !on)}
    >
      {spec.label}
    </Button>
  );
}
