import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The theme is CSS, so nothing type-checks it. This test does the job the
// type system does for a TS theme: every token in the light block has a dark
// value, every dark value has a light token, and every utility the
// `@theme inline` block maps points at a token that exists.

const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8");

// Values that do not change with the theme and so are only set once.
const lightOnly = new Set(["--tracking-normal", "--spacing"]);

function names(block: string): Set<string> {
  return new Set(
    [...block.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].flatMap((m) => m[1] ?? []),
  );
}

function section(start: string, end: string): string {
  const from = css.indexOf(start);
  const to = css.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`theme.css lost "${start}"`);
  return css.slice(from, to);
}

const light = names(section(":root {", "@variant dark {"));
const dark = names(section("@variant dark {", "@theme inline {"));
const mapped = section("@theme inline {", "@utility");

describe("theme tokens", () => {
  it("has a dark value for every light token", () => {
    const missing = [...light].filter(
      (name) => !dark.has(name) && !lightOnly.has(name),
    );
    expect(missing).toEqual([]);
  });

  it("has a light token for every dark value", () => {
    const missing = [...dark].filter((name) => !light.has(name));
    expect(missing).toEqual([]);
  });

  it("maps every color token to a utility", () => {
    const colors = [...light].filter((name) =>
      /^--(?!radius|shadow|tracking|spacing)/.test(name),
    );
    const missing = colors.filter(
      (name) => !mapped.includes(`--color${name.slice(1)}: var(${name})`),
    );
    expect(missing).toEqual([]);
  });

  it("maps utilities only to tokens that exist", () => {
    const refs = [...mapped.matchAll(/var\((--[a-z0-9-]+)\)/g)].flatMap(
      (m) => m[1] ?? [],
    );
    const unknown = refs.filter((name) => !light.has(name));
    expect(unknown).toEqual([]);
  });
});
