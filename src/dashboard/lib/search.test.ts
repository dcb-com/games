import { describe, expect, it } from "vitest";

import { searchText } from "~/dashboard/lib/search";

describe("one search value as text", () => {
  it("keeps a string as it is", () => {
    expect(searchText("work-locations")).toBe("work-locations");
    expect(searchText("")).toBe("");
  });

  // The reason this function exists: the router's parser turns an id that is
  // all digits into a number before a route ever sees it.
  it("keeps an id the parser read as a number", () => {
    expect(searchText(123)).toBe("123");
    expect(searchText(0)).toBe("0");
    expect(searchText(true)).toBe("true");
  });

  it("has no text for an absent value", () => {
    expect(searchText(undefined)).toBeUndefined();
    expect(searchText(null)).toBeUndefined();
  });

  it("has no text for something that is not an id", () => {
    expect(searchText({ a: 1 })).toBeUndefined();
    expect(searchText([1, 2])).toBeUndefined();
  });
});
