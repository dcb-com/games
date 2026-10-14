import { describe, expect, it } from "vitest";

import { tickLines } from "~/dashboard/components/dashboard/tick-lines";

describe("tickLines", () => {
  it("keeps a short name on one line", () => {
    expect(tickLines("Route Driver", 20)).toEqual(["Route Driver"]);
  });

  it("wraps a long name at a space", () => {
    expect(tickLines("Distribution Center (Dallas, TX)", 22)).toEqual([
      "Distribution Center",
      "(Dallas, TX)",
    ]);
  });

  it("cuts only what does not fit in two lines", () => {
    expect(tickLines("Inventory Control Specialist Level Two", 14)).toEqual([
      "Inventory",
      "Control Speci…",
    ]);
  });

  it("cuts one word longer than the line", () => {
    expect(tickLines("Supercalifragilistic", 8)).toEqual(["Superca…"]);
  });
});
