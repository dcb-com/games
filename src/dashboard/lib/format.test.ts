import { describe, expect, it } from "vitest";

import {
  fmtCompanyPhone,
  fmtFein,
  formatSsnLast4,
} from "~/dashboard/lib/format";

describe("formatSsnLast4", () => {
  it("shows only the last four digits, dotted", () => {
    expect(formatSsnLast4("123-45-7890")).toBe("•••-••-7890");
    expect(formatSsnLast4("123456789")).toBe("•••-••-6789");
  });

  it("pulls the last four digits out of an already-masked value", () => {
    expect(formatSsnLast4("***-**-1234")).toBe("•••-••-1234");
    expect(formatSsnLast4("XXX-XX-1234")).toBe("•••-••-1234");
  });

  it("returns null when there is nothing to show", () => {
    expect(formatSsnLast4("")).toBeNull();
    expect(formatSsnLast4(null)).toBeNull();
    expect(formatSsnLast4(undefined)).toBeNull();
    expect(formatSsnLast4("12")).toBeNull();
  });
});

describe("fmtFein", () => {
  it("puts the hyphen after the first two digits", () => {
    expect(fmtFein("930239690")).toBe("93-0239690");
  });

  it("leaves anything that is not nine digits as it was", () => {
    expect(fmtFein("93-0239690")).toBe("93-0239690");
    expect(fmtFein("")).toBe("-");
  });
});

describe("fmtCompanyPhone", () => {
  it("writes a US number the way people say it", () => {
    expect(fmtCompanyPhone("+12145550142")).toBe("(214) 555-0142");
    expect(fmtCompanyPhone("214.555.0142")).toBe("(214) 555-0142");
  });

  it("leaves a number it cannot read as it was", () => {
    expect(fmtCompanyPhone("ext 12")).toBe("ext 12");
    expect(fmtCompanyPhone("")).toBe("-");
  });
});
