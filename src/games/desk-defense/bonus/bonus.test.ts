import { describe, expect, it } from "vitest";

import { BONUSES, bonusCoins } from "~/games/desk-defense/bonus";
import type { BonusRun, Input, Key } from "~/games/desk-defense/bonus/kit";
import { H, W } from "~/games/desk-defense/bonus/kit";
import { BONUS_ORDER } from "~/games/desk-defense/levels";

const KEYS: Key[] = ["left", "right", "up", "down", "action"];

// Mash keys and click about for a whole game. It must end on time, never
// throw, and never score below zero.
function mash(run: BonusRun) {
  const input: Input = { held: new Set() };
  for (let t = 0; t < run.seconds + 2 && !run.over; t += 1 / 30) {
    const key = KEYS[Math.floor(Math.random() * KEYS.length)] ?? "action";
    if (Math.random() < 0.2) {
      run.press(key);
      input.held.add(key);
    }
    if (Math.random() < 0.1) input.held.clear();
    if (Math.random() < 0.05)
      run.point(Math.random() * W, Math.random() * H, Math.random() < 0.5);
    run.step(1 / 30, input);
  }
}

describe("every bonus game", () => {
  for (const id of BONUS_ORDER) {
    it(`${id} plays to the end`, () => {
      const run = BONUSES[id].make("office");
      mash(run);
      expect(run.over).toBe(true);
      expect(run.time).toBeLessThanOrEqual(run.seconds + 0.1);
      expect(run.score).toBeGreaterThanOrEqual(0);
      expect(run.id).toBe(id);
    });
  }

  it("pays more coins for a great run", () => {
    expect(bonusCoins("whack", 40)).toBeGreaterThan(bonusCoins("whack", 10));
    expect(bonusCoins("whack", 0)).toBeGreaterThan(0);
  });
});

describe("a few rules", () => {
  it("ends Paper Plane at the first crash", () => {
    const run = BONUSES.plane.make("office");
    run.press("action");
    const input: Input = { held: new Set() };
    // Never flap again: it falls and crashes long before time is up.
    for (let t = 0; t < 10 && !run.over; t += 1 / 30) run.step(1 / 30, input);
    expect(run.over).toBe(true);
    expect(run.time).toBeLessThan(10);
  });

  it("ends Shredder Snake when it runs into the edge", () => {
    const run = BONUSES.snake.make("office");
    const input: Input = { held: new Set() };
    run.press("up");
    for (let t = 0; t < 10 && !run.over; t += 1 / 30) run.step(1 / 30, input);
    expect(run.over).toBe(true);
  });
});
