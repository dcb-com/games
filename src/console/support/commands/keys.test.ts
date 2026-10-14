import { describe, expect, it } from "vitest";

import { keyLabels, parseKeys, strokeMatches } from "./keys";

function press(
  key: string,
  mods: Partial<{
    shiftKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
  }> = {},
) {
  return {
    key,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...mods,
  };
}

function one(keys: string) {
  const [stroke] = parseKeys(keys);
  if (!stroke) throw new Error(`no stroke in ${keys}`);
  return stroke;
}

describe("parseKeys", () => {
  it("reads one key, a modifier and a sequence", () => {
    expect(parseKeys("e")).toEqual([{ key: "e", shift: false, mod: false }]);
    expect(parseKeys("shift+p")).toEqual([
      { key: "p", shift: true, mod: false },
    ]);
    expect(parseKeys("g n")).toHaveLength(2);
  });
});

describe("strokeMatches", () => {
  const e = one("e");
  const shiftP = one("shift+p");
  const modK = one("mod+k");
  const question = one("?");

  it("matches a plain key only with no modifier", () => {
    expect(strokeMatches(e, press("e"), true)).toBe(true);
    expect(strokeMatches(e, press("E", { shiftKey: true }), true)).toBe(false);
    expect(strokeMatches(e, press("e", { metaKey: true }), true)).toBe(false);
    expect(strokeMatches(e, press("e", { altKey: true }), true)).toBe(false);
  });

  it("matches shift keys whatever case the browser reports", () => {
    expect(strokeMatches(shiftP, press("P", { shiftKey: true }), true)).toBe(
      true,
    );
    expect(strokeMatches(shiftP, press("p"), true)).toBe(false);
  });

  it("reads mod as ⌘ on a Mac and Ctrl elsewhere", () => {
    expect(strokeMatches(modK, press("k", { metaKey: true }), true)).toBe(true);
    expect(strokeMatches(modK, press("k", { ctrlKey: true }), true)).toBe(
      false,
    );
    expect(strokeMatches(modK, press("k", { ctrlKey: true }), false)).toBe(
      true,
    );
  });

  it("matches a printed character with its shift", () => {
    expect(strokeMatches(question, press("?", { shiftKey: true }), true)).toBe(
      true,
    );
  });
});

describe("keyLabels", () => {
  it("prints keys for a person", () => {
    expect(keyLabels("mod+k", true)).toEqual([["⌘", "K"]]);
    expect(keyLabels("mod+k", false)).toEqual([["Ctrl", "K"]]);
    expect(keyLabels("g n", true)).toEqual([["G"], ["N"]]);
    expect(keyLabels("shift+p", true)).toEqual([["⇧", "P"]]);
  });
});
