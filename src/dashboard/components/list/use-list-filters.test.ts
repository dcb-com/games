import { describe, expect, expectTypeOf, it } from "vitest";

import type { RawSearchValue } from "~/dashboard/lib/search";
import type {
  DateRange,
  FilterSpecs,
  FilterValues,
} from "~/dashboard/components/list/use-list-filters";
import {
  emptyValue,
  emptyValues,
  isEmpty,
  isFilteredOf,
  isViewOf,
  readPagination,
  readSorting,
  readValues,
  resetKeyOf,
  shapeOf,
  sortInputOf,
  viewValuesOf,
  writePagination,
  writeParams,
  writeSorting,
} from "~/dashboard/components/list/use-list-filters";

const SPECS = {
  search: {
    kind: "search",
    label: "Search administrators",
    placeholder: "Search by name or email",
  },
  role: {
    kind: "one",
    label: "Role",
    options: [
      { value: "r1", label: "Payroll Clerk" },
      { value: "r2", label: "Admin" },
    ],
  },
  paid: { kind: "dateRange", label: "Paid" },
  mine: { kind: "flag", label: "Assigned to me" },
} satisfies FilterSpecs;

const SHAPE = shapeOf(SPECS);

function values(over: Partial<FilterValues<typeof SPECS>> = {}) {
  return { ...emptyValues(SHAPE), ...over };
}

describe("shapeOf", () => {
  it("keeps the kinds and nothing else", () => {
    expect(SHAPE).toEqual({
      search: "search",
      role: "one",
      paid: "dateRange",
      mine: "flag",
    });
  });
});

describe("empty values", () => {
  it("starts every kind at the value that means 'not filtering'", () => {
    expect(emptyValue("search")).toBe("");
    expect(emptyValue("one")).toBe("");
    expect(emptyValue("flag")).toBe(false);
    expect(emptyValue("dateRange")).toEqual({ from: "", to: "" });
  });

  it("reads a half-open range as filtering", () => {
    expect(isEmpty({ from: "2026-01-01", to: "" })).toBe(false);
    expect(isEmpty({ from: "", to: "" })).toBe(true);
    expect(isFilteredOf(values())).toBe(false);
    expect(isFilteredOf(values({ mine: true }))).toBe(true);
    expect(isFilteredOf(values({ role: "r1" }))).toBe(true);
    expect(isFilteredOf(values({ paid: { from: "", to: "2026-02-14" } }))).toBe(
      true,
    );
  });
});

describe("readValues", () => {
  it("reads every filter out of the address", () => {
    const read = readValues(SHAPE, {
      search: "ada",
      role: "r2",
      mine: "1",
      paidFrom: "2026-01-01",
    });

    expect(read).toEqual({
      search: "ada",
      role: "r2",
      paid: { from: "2026-01-01", to: "" },
      mine: true,
    });
  });

  it("reads a filter the address does not name as off", () => {
    expect(readValues(SHAPE, {})).toEqual(values());
  });

  it("accepts either spelling of a flag that is on", () => {
    const read = (raw: RawSearchValue) =>
      readValues({ mine: "flag" }, { mine: raw });
    expect(read("1")).toEqual({ mine: true });
    expect(read("true")).toEqual({ mine: true });
    expect(read("0")).toEqual({ mine: false });
    expect(read(undefined)).toEqual({ mine: false });
  });

  // The router reads a query string with a JSON-aware parser, so a value that
  // is all digits reaches a page as a number.
  it("reads a value the router parsed as something other than text", () => {
    expect(readValues({ role: "one" }, { role: 123 })).toEqual({ role: "123" });
    expect(readValues({ mine: "flag" }, { mine: 1 })).toEqual({ mine: true });
  });
});

describe("writeParams", () => {
  it("writes a date range as two keys", () => {
    expect(
      writeParams(SHAPE, {
        role: "r2",
        mine: true,
        paid: { from: "2026-01-01", to: "2026-02-14" },
      }),
    ).toEqual({
      role: "r2",
      mine: "1",
      paidFrom: "2026-01-01",
      paidTo: "2026-02-14",
      search: undefined,
    });
  });

  // The router drops an undefined key, so a filter that is off leaves no key
  // behind rather than an empty one.
  it("has no value for a filter that is off", () => {
    expect(
      writeParams(SHAPE, {
        role: "",
        mine: false,
        paid: { from: "", to: "" },
      }),
    ).toEqual({
      role: undefined,
      mine: undefined,
      paidFrom: undefined,
      paidTo: undefined,
      search: undefined,
    });
  });

  it("names only the keys its own filters own", () => {
    // A key another part of the page put in the address is not mentioned, so
    // merging this over the address leaves it alone.
    expect(Object.keys(writeParams({ role: "one" }, { role: "r2" }))).toEqual([
      "role",
    ]);
  });
});

describe("the sorted column", () => {
  it("reads the column the address names", () => {
    expect(readSorting({ sortBy: "name", sortDir: "asc" }, null)).toEqual([
      { id: "name", desc: false },
    ]);
    expect(readSorting({ sortBy: "payDate", sortDir: "desc" }, null)).toEqual([
      { id: "payDate", desc: true },
    ]);
  });

  it("falls back to the column the page starts on", () => {
    const start = { id: "name", desc: false };
    expect(readSorting({}, start)).toEqual([start]);
    expect(readSorting({}, null)).toEqual([]);
    // A direction on its own sorts nothing.
    expect(readSorting({ sortDir: "asc" }, start)).toEqual([start]);
  });

  it("reads anything but ascending as descending", () => {
    expect(readSorting({ sortBy: "name" }, null)).toEqual([
      { id: "name", desc: true },
    ]);
  });

  it("writes the column back, and clears both keys when there is none", () => {
    expect(writeSorting([{ id: "name", desc: false }])).toEqual({
      sortBy: "name",
      sortDir: "asc",
    });
    expect(writeSorting([])).toEqual({
      sortBy: undefined,
      sortDir: undefined,
    });
  });
});

describe("the page in view", () => {
  it("reads the page and the page length the address names", () => {
    expect(readPagination({ page: "3", pageSize: "50" }, 20)).toEqual({
      pageIndex: 2,
      pageSize: 50,
    });
  });

  it("reads an address with nothing to say as the first page", () => {
    expect(readPagination({}, 20)).toEqual({ pageIndex: 0, pageSize: 20 });
  });

  it("ignores a page length nobody can choose", () => {
    expect(readPagination({ pageSize: "5000" }, 20).pageSize).toBe(20);
    expect(readPagination({ page: "nonsense" }, 20).pageIndex).toBe(0);
  });

  it("writes back only what the address does not already imply", () => {
    expect(writePagination({ pageIndex: 0, pageSize: 20 }, 20)).toEqual({
      page: undefined,
      pageSize: undefined,
    });
    expect(writePagination({ pageIndex: 2, pageSize: 50 }, 20)).toEqual({
      page: 3,
      pageSize: 50,
    });
  });
});

describe("views", () => {
  const view = { role: "r1", mine: true };

  it("is active only while the filters are exactly the view's", () => {
    expect(isViewOf(SHAPE, values({ role: "r1", mine: true }), view)).toBe(
      true,
    );
    expect(isViewOf(SHAPE, values({ role: "r1" }), view)).toBe(false);
    expect(
      isViewOf(
        SHAPE,
        values({
          role: "r1",
          mine: true,
          paid: { from: "2026-01-01", to: "" },
        }),
        view,
      ),
    ).toBe(false);
  });

  it("ignores the search box", () => {
    expect(isViewOf(SHAPE, values({ search: "ada" }), {})).toBe(true);
  });

  it("sets the view's values, keeps the search and clears the rest", () => {
    expect(
      viewValuesOf(
        SHAPE,
        values({ search: "ada", paid: { from: "2026-01-01", to: "" } }),
        view,
      ),
    ).toEqual(values({ search: "ada", role: "r1", mine: true }));
  });
});

describe("sortInputOf", () => {
  it("maps the first sorted column, and calls no sort descending", () => {
    expect(sortInputOf([{ id: "payDay", desc: true }])).toEqual({
      sortBy: "payDay",
      sortDir: "desc",
    });
    expect(sortInputOf([{ id: "name", desc: false }])).toEqual({
      sortBy: "name",
      sortDir: "asc",
    });
    expect(sortInputOf([])).toEqual({ sortBy: undefined, sortDir: "desc" });
  });
});

describe("resetKeyOf", () => {
  const sort = { sortBy: "payDay", sortDir: "desc" } as const;

  it("is the same key however the values were built", () => {
    const a = resetKeyOf({ search: "ada", role: "r1" }, sort);
    const b = resetKeyOf({ role: "r1", search: "ada" }, sort);
    expect(a).toBe(b);
  });

  it("changes when a filter changes", () => {
    expect(resetKeyOf(values({ search: "ada" }), sort)).not.toBe(
      resetKeyOf(values({ search: "ad" }), sort),
    );
  });

  it("changes when the sort changes", () => {
    expect(resetKeyOf(values(), sort)).not.toBe(
      resetKeyOf(values(), { sortBy: "payDay", sortDir: "asc" }),
    );
  });
});

describe("the value types a page gets back", () => {
  it("follows each key's kind", () => {
    type Values = FilterValues<typeof SPECS>;
    expectTypeOf<Values["search"]>().toEqualTypeOf<string>();
    expectTypeOf<Values["role"]>().toEqualTypeOf<string>();
    expectTypeOf<Values["mine"]>().toEqualTypeOf<boolean>();
    expectTypeOf<Values["paid"]>().toEqualTypeOf<DateRange>();
  });
});
