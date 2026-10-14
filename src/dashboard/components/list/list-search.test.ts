import {
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import {
  listSearch,
  searchKeysOf,
} from "~/dashboard/components/list/list-search";

const FILTERS = { role: "one", paid: "dateRange", mine: "flag" } as const;

describe("a list page's search schema", () => {
  const validate = listSearch(FILTERS);
  const from = (query: string) => validate(defaultParseSearch(query));

  it("gives a date range two keys and every other filter one", () => {
    expect(searchKeysOf(FILTERS)).toEqual([
      "role",
      "paidFrom",
      "paidTo",
      "mine",
    ]);
  });

  it("reads the filters out of an address", () => {
    expect(from("?role=r2&paidFrom=2026-01-01&paidTo=2026-02-14")).toEqual({
      role: "r2",
      paidFrom: "2026-01-01",
      paidTo: "2026-02-14",
    });
  });

  // The router parses a query string before a route sees it, so an id that is
  // all digits arrives as a number and a flag written as "1" does too.
  it("reads a value the parser turned into a number", () => {
    expect(from("?role=123&mine=1")).toEqual({ role: "123", mine: "1" });
  });

  it("carries the sorted column, and needs a column to carry one", () => {
    expect(from("?sortBy=name&sortDir=asc")).toEqual({
      sortBy: "name",
      sortDir: "asc",
    });
    // Anything but ascending reads as descending, and a lone direction is
    // not a sort at all.
    expect(from("?sortBy=name")).toEqual({ sortBy: "name", sortDir: "desc" });
    expect(from("?sortDir=asc")).toEqual({});
  });

  it("carries the page, and never the first one", () => {
    expect(from("?page=3&pageSize=50")).toEqual({ page: "3", pageSize: "50" });
    // The first page is what a bare address means.
    expect(from("?page=1")).toEqual({});
    expect(from("?page=-2")).toEqual({});
    // Which length is the usual one belongs to the page, not to the schema,
    // so any length someone could choose is carried.
    expect(from("?pageSize=20")).toEqual({ pageSize: "20" });
    // A length nobody can choose would ask the server for that many rows.
    expect(from("?pageSize=5000")).toEqual({});
  });

  it("keeps nothing for a filter that is off or unknown", () => {
    expect(from("?role=&tab=people")).toEqual({});
    expect(from("")).toEqual({});
  });

  // What `writeParams` leans on to clear a filter: the key goes, rather than
  // staying behind with nothing after the `=`.
  it("leaves no key behind when a filter is cleared", () => {
    expect(defaultStringifySearch({ role: "r2", paidFrom: undefined })).toBe(
      "?role=r2",
    );
    expect(defaultStringifySearch({ role: undefined })).toBe("");
  });
});
