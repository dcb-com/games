import { describe, expect, it } from "vitest";

import { LEVEL_COUNT, buildLevel } from "~/games/desk-defense/levels";
import type { Round } from "~/games/desk-defense/round";
import { finalScore, newRound, place, step } from "~/games/desk-defense/round";
import { boostsFrom, NO_UPGRADES } from "~/games/desk-defense/upgrades";

const plain = boostsFrom(NO_UPGRADES);

function run(r: Round, seconds: number) {
  for (let t = 0; t < seconds && r.outcome === "playing"; t += 0.05) {
    step(r, 0.05);
  }
}

// A steady player: coffee in the first column, staplers to the right of
// it, row by row, whenever energy allows.
function playWell(r: Round, seconds: number) {
  for (let t = 0; t < seconds && r.outcome === "playing"; t += 0.05) {
    for (const row of r.level.rows) {
      if (place(r, "coffee", row, 0) === "placed") break;
    }
    for (const col of [1, 2, 3]) {
      for (const row of r.level.rows) place(r, "stapler", row, col);
    }
    step(r, 0.05);
  }
}

describe("levels", () => {
  it("has more than thirty, and the first one is guided", () => {
    expect(LEVEL_COUNT).toBeGreaterThanOrEqual(30);
    expect(buildLevel(1).guided).toBe(true);
    expect(buildLevel(2).guided).toBe(false);
  });

  it("gets harder as it goes", () => {
    for (let n = 3; n < LEVEL_COUNT; n++) {
      const a = buildLevel(n);
      const b = buildLevel(n + 1);
      // Bosses come on a few levels only, so they are left out here.
      const plainBugs = (l: typeof a) =>
        l.spawns.filter((s) => s.kind !== "ransom").length;
      expect(plainBugs(b)).toBeGreaterThanOrEqual(plainBugs(a));
      expect(b.hpScale).toBeGreaterThan(a.hpScale);
    }
  });

  it("is the same round every time", () => {
    expect(buildLevel(17)).toEqual(buildLevel(17));
  });

  it("only sends bugs down open rows", () => {
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const level = buildLevel(n);
      for (const s of level.spawns) expect(level.rows).toContain(s.row);
    }
  });
});

describe("a round", () => {
  it("spends energy to place a helper and refuses a second in the same cell", () => {
    const r = newRound(buildLevel(1), plain);
    expect(place(r, "coffee", 2, 0)).toBe("placed");
    expect(r.energy).toBe(100);
    expect(place(r, "stapler", 2, 0)).toBe("taken");
    expect(place(r, "stapler", 0, 3)).toBe("closed-row");
    expect(place(r, "coffee", 2, 1)).toBe("recharging");
  });

  it("is lost when bugs pass an empty desk twice in one row", () => {
    const r = newRound(buildLevel(1), plain);
    run(r, 200);
    expect(r.outcome).toBe("lost");
  });

  it("is won by a steady player on the guided level, with a bonus", () => {
    const r = newRound(buildLevel(1), plain);
    playWell(r, 200);
    expect(r.outcome).toBe("won");
    expect(finalScore(r)).toBeGreaterThan(r.points);
  });

  it("starts with more energy after the head start upgrade", () => {
    const r = newRound(
      buildLevel(4),
      boostsFrom({ ...NO_UPGRADES, energy: 2 }),
    );
    expect(r.energy).toBe(100);
  });
});
