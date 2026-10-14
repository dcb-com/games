// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";

import { applyPreset, PRESETS, resetMock } from "~/mock/store";
import { routeTree } from "~/routeTree.gen";

// Every screen renders in every mock state, and the game box is where it
// should be. This catches a copied component that breaks when its data
// changes shape.

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const SCREENS = {
  console: ["idle", "waiting", "ringing", "on-call", "wrap-up", "not-live"],
  payroll: ["timesheet", "calculating", "review", "finalizing", "done"],
} as const;

// Where the box shows, and what it says, for each state.
const SLOT: Record<string, string | null> = {
  idle: "free",
  waiting: "pause",
  ringing: "pause",
  "on-call": "closed",
  "wrap-up": "pause",
  "not-live": null,
  timesheet: null,
  calculating: "free",
  review: null,
  finalizing: "free",
  done: null,
};

let unmount: (() => void) | null = null;
afterEach(() => {
  unmount?.();
  unmount = null;
  resetMock();
});

async function render(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<RouterProvider router={router} />);
    await router.load();
  });
  unmount = () => {
    act(() => root.unmount());
    el.remove();
  };
  return el;
}

describe.each(Object.entries(SCREENS))("/%s", (screen, states) => {
  it.each(states)("renders %s", async (state) => {
    expect(Object.keys(PRESETS)).toContain(state);
    applyPreset(state);
    const el = await render(`/${screen}`);
    const slot = el.querySelector<HTMLElement>("[data-game-slot]");
    expect(slot?.dataset.moment ?? null).toBe(SLOT[state]);
  });
});
