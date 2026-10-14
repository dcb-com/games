import { describe, expect, it } from "vitest";

import { factListClasses } from "~/dashboard/components/fact-list";

describe("factListClasses", () => {
  it("stacks rows with a rule between them", () => {
    const rows = factListClasses("rows");
    expect(rows.list).toContain("divide-y");
    expect(rows.item).toContain("justify-between");
  });

  it("defaults to rows", () => {
    expect(factListClasses()).toEqual(factListClasses("rows"));
  });

  it("pairs a grid in two columns, and reaches three when asked", () => {
    expect(factListClasses("grid").list).toContain("sm:grid-cols-2");
    expect(factListClasses("grid").list).not.toContain("lg:grid-cols-3");
    expect(factListClasses("grid", 3).list).toContain("lg:grid-cols-3");
  });

  it("runs an inline strip along one line, label above value", () => {
    const inline = factListClasses("inline");
    expect(inline.list).toContain("flex-wrap");
    expect(inline.item).toContain("flex-col");
  });

  it("ignores the column count outside a grid", () => {
    expect(factListClasses("rows", 3)).toEqual(factListClasses("rows", 2));
    expect(factListClasses("inline", 3)).toEqual(factListClasses("inline", 2));
  });

  it("gives every layout the same label role and a tabular value", () => {
    for (const layout of ["rows", "grid", "inline"] as const) {
      const classes = factListClasses(layout);
      expect(classes.label).toBe("type-caption");
      expect(classes.value).toContain("tabular-nums");
    }
  });

  it("gives each layout its own list class", () => {
    const lists = (["rows", "grid", "inline"] as const).map(
      (layout) => factListClasses(layout).list,
    );
    expect(new Set(lists).size).toBe(3);
  });
});
