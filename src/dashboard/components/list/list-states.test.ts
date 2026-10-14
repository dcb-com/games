import { describe, expect, it } from "vitest";

import {
  CLEAR_FILTERS_LABEL,
  emptyTitle,
  FILTERED_EMPTY_DESCRIPTION,
} from "~/dashboard/components/list/list-states";

describe("emptyTitle", () => {
  it("says 'No {many} yet' when nothing is filtered", () => {
    expect(emptyTitle({ one: "invoice", many: "invoices" })).toBe(
      "No invoices yet",
    );
    expect(emptyTitle({ many: "payroll runs" }, false)).toBe(
      "No payroll runs yet",
    );
  });

  it("says 'No {many} match these filters' when a filter is on", () => {
    expect(emptyTitle({ one: "invoice", many: "invoices" }, true)).toBe(
      "No invoices match these filters",
    );
    expect(emptyTitle({ many: "administrators" }, true)).toBe(
      "No administrators match these filters",
    );
  });

  it("keeps the same noun in both branches", () => {
    const noun = { one: "onboarding", many: "onboardings" };
    for (const title of [emptyTitle(noun), emptyTitle(noun, true)]) {
      expect(title.startsWith("No onboardings")).toBe(true);
    }
  });

  it("ignores the singular, which only the caller uses", () => {
    expect(emptyTitle({ one: "person", many: "people" }, true)).toBe(
      "No people match these filters",
    );
  });

  it("echoes a search query in curly quotes when one was given", () => {
    expect(emptyTitle({ many: "settings" }, true, "zzzznotfound")).toBe(
      "No settings match “zzzznotfound”",
    );
  });

  it("trims the query before echoing it", () => {
    expect(emptyTitle({ many: "settings" }, true, "  zzz  ")).toBe(
      "No settings match “zzz”",
    );
  });

  it("falls back to the generic sentence when there is no query", () => {
    expect(emptyTitle({ many: "settings" }, true, "")).toBe(
      "No settings match these filters",
    );
    expect(emptyTitle({ many: "settings" }, true, "   ")).toBe(
      "No settings match these filters",
    );
    expect(emptyTitle({ many: "settings" }, true, undefined)).toBe(
      "No settings match these filters",
    );
  });

  it("never echoes a query on the nothing-yet branch", () => {
    expect(emptyTitle({ many: "settings" }, false, "zzz")).toBe(
      "No settings yet",
    );
  });
});

describe("the fixed copy", () => {
  it("has one filtered sentence and one clear label", () => {
    expect(FILTERED_EMPTY_DESCRIPTION).toBe(
      "Nothing here fits the search and filters above.",
    );
    expect(CLEAR_FILTERS_LABEL).toBe("Clear filters");
  });
});
