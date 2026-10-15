// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import {
  buyUpgrade,
  getProgress,
  leaderboard,
  parseProgress,
  recordRound,
  resetProgressCache,
} from "~/games/desk-defense/progress";

const me = { name: "Alex Agent", email: "alex.agent@example.com" };

beforeEach(() => {
  localStorage.clear();
  resetProgressCache();
});

describe("progress", () => {
  it("starts empty and survives odd stored data", () => {
    expect(parseProgress(null, me).coins).toBe(0);
    expect(parseProgress("not json", me).cleared).toBe(0);
    const odd = parseProgress(
      JSON.stringify({
        coins: -5,
        cleared: 99,
        owned: { energy: 40 },
        best: { 2: "x" },
      }),
      me,
    );
    expect(odd.coins).toBe(0);
    expect(odd.cleared).toBe(36);
    expect(odd.owned.energy).toBe(5);
    expect(odd.best).toEqual({});
  });

  it("pays coins, keeps the best score and unlocks the next level", () => {
    const first = recordRound(me, 1, 300, 60, true);
    expect(first.firstClear).toBe(true);
    expect(getProgress(me).cleared).toBe(1);
    expect(getProgress(me).coins).toBe(first.coins);
    recordRound(me, 1, 200, 40, true);
    expect(getProgress(me).best[1]).toBe(300);
  });

  it("does not count a lost round on the leaderboard", () => {
    recordRound(me, 1, 500, 100, false);
    expect(getProgress(me).best[1]).toBeUndefined();
    expect(getProgress(me).cleared).toBe(0);
  });

  it("spends coins on an upgrade only when there are enough", () => {
    expect(buyUpgrade(me, "energy")).toBe(false);
    recordRound(me, 1, 300, 400, true);
    expect(buyUpgrade(me, "energy")).toBe(true);
    expect(getProgress(me).owned.energy).toBe(1);
  });

  it("keeps the progress in storage", () => {
    recordRound(me, 1, 300, 60, true);
    resetProgressCache();
    expect(getProgress(me).best[1]).toBe(300);
  });
});

describe("the leaderboard", () => {
  it("puts the best first and includes the player", () => {
    const rows = leaderboard(me);
    expect(rows.length).toBeGreaterThan(5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]?.score).toBeGreaterThanOrEqual(rows[i]?.score ?? 0);
    }
    expect(rows.some((r) => r.email === me.email)).toBe(true);
  });

  it("moves a player up as they clear levels", () => {
    recordRound(me, 1, 20000, 100, true);
    expect(leaderboard(me)[0]?.email).toBe(me.email);
  });

  it("shows other players who have played in this browser", () => {
    const pat = { name: "Pat Admin", email: "pat.admin@example.com" };
    recordRound(pat, 1, 15000, 100, true);
    expect(leaderboard(me).some((r) => r.email === pat.email)).toBe(true);
  });
});
