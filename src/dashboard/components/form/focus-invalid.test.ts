import { afterEach, describe, expect, it, vi } from "vitest";

import type { InvalidControlRoot } from "~/dashboard/components/form/focus-invalid";
import { focusFirstInvalid } from "~/dashboard/components/form/focus-invalid";

// The dashboard's vitest run has no DOM environment (see vitest.config.ts), so
// these stand in for the elements: a root that answers the one selector the
// helper asks for, and controls that record how they were called.

interface Call {
  focus: { preventScroll?: boolean } | undefined;
  scroll: ScrollIntoViewOptions | undefined;
}

function control(invalid: boolean, calls: Call[]) {
  const record: Call = { focus: undefined, scroll: undefined };
  return {
    invalid,
    focus: (options?: { preventScroll?: boolean }) => {
      record.focus = options;
      calls.push(record);
    },
    scrollIntoView: (options?: ScrollIntoViewOptions) => {
      record.scroll = options;
    },
  };
}

function rootOf(...controls: ReturnType<typeof control>[]) {
  return {
    querySelector: (selector: string) =>
      selector === '[aria-invalid="true"]'
        ? (controls.find((c) => c.invalid) ?? null)
        : null,
  } satisfies InvalidControlRoot;
}

function reduceMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query }));
}

afterEach(() => vi.unstubAllGlobals());

describe("focusFirstInvalid", () => {
  it("takes the first invalid control, not a later one", () => {
    const calls: Call[] = [];
    const valid = control(false, calls);
    const first = control(true, calls);
    const second = control(true, calls);

    expect(focusFirstInvalid(rootOf(valid, first, second))).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.focus).toEqual({ preventScroll: true });
    expect(calls[0]?.scroll).toEqual({ block: "center", behavior: "smooth" });
  });

  it("does nothing when every control is valid", () => {
    const calls: Call[] = [];
    expect(focusFirstInvalid(rootOf(control(false, calls)))).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("does nothing without a root", () => {
    expect(focusFirstInvalid(null)).toBe(false);
    expect(focusFirstInvalid(undefined)).toBe(false);
  });

  it("scrolls without animation when the reader asks for less motion", () => {
    const calls: Call[] = [];
    reduceMotion(true);
    focusFirstInvalid(rootOf(control(true, calls)));
    expect(calls[0]?.scroll).toEqual({ block: "center", behavior: "auto" });
  });

  it("scrolls smoothly otherwise", () => {
    const calls: Call[] = [];
    reduceMotion(false);
    focusFirstInvalid(rootOf(control(true, calls)));
    expect(calls[0]?.scroll).toEqual({ block: "center", behavior: "smooth" });
  });
});
