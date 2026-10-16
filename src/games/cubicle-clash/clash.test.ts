// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { CLASH_RIVALS } from "~/mock/game-scores";
import type { Base, Wallet } from "~/games/cubicle-clash/base";
import {
  build,
  collectAll,
  limitOf,
  move,
  nextLevel,
  officeLevel,
  starterBase,
  stored,
  upgrade,
} from "~/games/cubicle-clash/base";
import type { Raid } from "~/games/cubicle-clash/raid";
import {
  canDrop,
  destruction,
  drop,
  newRaid,
  starsOf,
  step,
  trophyChange,
} from "~/games/cubicle-clash/raid";
import { lootOf, rivalBase } from "~/games/cubicle-clash/rivals";
import {
  NO_ARMY,
  freshClash,
  getClash,
  parseClash,
  raidsWhileAway,
  resetClashCache,
  saveClash,
  trophyBoard,
  welcomeBack,
} from "~/games/cubicle-clash/save";
import { RAID_SECONDS } from "~/games/cubicle-clash/units";

const me = { name: "Alex Agent", email: "alex.agent@example.com" };
const MINUTE = 60_000;

beforeEach(() => {
  localStorage.clear();
  resetClashCache();
});

function rich(): Wallet {
  return { coins: 1e6, coffee: 1e6 };
}

function run(r: Raid, seconds: number) {
  for (let t = 0; t < seconds && r.outcome === "playing"; t += 0.05)
    step(r, 0.05);
}

describe("a base", () => {
  it("builds only on free tiles inside the edge, within the head office's limits", () => {
    const base = starterBase(0);
    const wallet = rich();
    expect(build(base, wallet, "stapler", 0, 3, 0)).toBe("edge");
    expect(build(base, wallet, "stapler", 7, 3, 0)).toBe("taken");
    expect(build(base, wallet, "stapler", 2, 2, 0)).toBe("built");
    // A level 1 head office allows two stapler turrets, and one is in the starter base.
    expect(build(base, wallet, "stapler", 2, 3, 0)).toBe("full");
    expect(limitOf(base, "printer")).toBe(0);
  });

  it("refuses to build without the coins", () => {
    const base = starterBase(0);
    expect(build(base, { coins: 5, coffee: 0 }, "press", 2, 2, 0)).toBe(
      "coins",
    );
  });

  it("caps other buildings at the head office's level", () => {
    const base = starterBase(0);
    const wallet = rich();
    const press = base.buildings.find((b) => b.kind === "press");
    if (!press) throw new Error("no press");
    expect(nextLevel(base, press)).toEqual({ blocked: "office" });
    const office = base.buildings.find((b) => b.kind === "office");
    if (!office) throw new Error("no office");
    expect(upgrade(base, wallet, office, 0)).toBe("upgraded");
    expect(officeLevel(base)).toBe(2);
    expect(upgrade(base, wallet, press, 0)).toBe("upgraded");
    expect(press.level).toBe(2);
  });

  it("fills a press over time, up to what it holds, and collects into the wallet", () => {
    const base = starterBase(0);
    const press = base.buildings.find((b) => b.kind === "press");
    if (!press) throw new Error("no press");
    expect(stored(press, 5 * MINUTE)).toBe(30);
    expect(stored(press, 600 * MINUTE)).toBe(90);
    const wallet = { coins: 0, coffee: 0 };
    const got = collectAll(base, wallet, 5 * MINUTE);
    expect(got.coins).toBe(30);
    expect(wallet.coins).toBe(30);
    expect(stored(press, 5 * MINUTE)).toBe(0);
  });

  it("moves a building only to a free spot", () => {
    const base = starterBase(0);
    const stapler = base.buildings.find((b) => b.kind === "stapler");
    if (!stapler) throw new Error("no stapler");
    expect(move(base, stapler, 7, 4)).toBe(false);
    expect(move(base, stapler, 2, 2)).toBe(true);
    expect(stapler.col).toBe(2);
  });
});

describe("coworkers' bases", () => {
  it("are the same every visit and grow with the head office", () => {
    const [big] = CLASH_RIVALS;
    const small = CLASH_RIVALS.at(-1);
    if (!big || !small) throw new Error("no rivals");
    expect(rivalBase(big)).toEqual(rivalBase(big));
    expect(rivalBase(big).buildings.length).toBeGreaterThan(
      rivalBase(small).buildings.length,
    );
    expect(lootOf(big).coins).toBeGreaterThan(lootOf(small).coins);
  });
});

function raidOn(base: Base, army: Partial<typeof NO_ARMY>) {
  return newRaid(
    { name: "Test", email: "t@example.com" },
    base,
    { ...NO_ARMY, ...army },
    {
      coins: 1000,
      coffee: 500,
    },
  );
}

describe("a raid", () => {
  it("lets troops land only on open floor away from buildings", () => {
    const r = raidOn(starterBase(0), { fuzzball: 2 });
    expect(canDrop(r, 0, 0)).toBe(true);
    expect(canDrop(r, 2, 2)).toBe(true);
    expect(canDrop(r, 3, 2)).toBe(false);
    expect(canDrop(r, 6, 3)).toBe(false);
    expect(drop(r, "fuzzball", 6, 3)).toBe("too-close");
    expect(drop(r, "fuzzball", 0, 0)).toBe("dropped");
    expect(drop(r, "zippy", 0, 0)).toBe("none-left");
  });

  it("is won by a crowd of fuzzballs against a small, undefended base", () => {
    const base: Base = {
      buildings: starterBase(0).buildings.filter((b) => b.kind !== "stapler"),
      nextId: 9,
    };
    const r = raidOn(base, { fuzzball: 12 });
    for (let i = 0; i < 12; i++)
      drop(r, "fuzzball", i % 2 === 0 ? 0 : 15, 1 + (i % 6));
    run(r, RAID_SECONDS);
    expect(r.outcome).toBe("done");
    expect(destruction(r)).toBe(1);
    expect(starsOf(r)).toBe(3);
  });

  it("lets a stapler turret stop a lone fuzzball", () => {
    const r = raidOn(starterBase(0), { fuzzball: 1 });
    drop(r, "fuzzball", 15, 6);
    run(r, RAID_SECONDS);
    expect(r.troops).toHaveLength(0);
    expect(starsOf(r)).toBe(0);
  });

  it("makes troops break walls, but hoppers jump them", () => {
    const base: Base = {
      buildings: [
        { id: 1, kind: "office", level: 1, col: 7, row: 3, since: 0 },
        ...[2, 3, 4, 5].map((row, i) => ({
          id: 2 + i,
          kind: "wall" as const,
          level: 1,
          col: 5,
          row,
          since: 0,
        })),
      ],
      nextId: 9,
    };
    const walker = raidOn(base, { fuzzball: 1 });
    drop(walker, "fuzzball", 1, 4);
    run(walker, 6);
    const wallHit = walker.targets.some(
      (t) => t.kind === "wall" && t.hp < t.maxHp,
    );
    expect(wallHit).toBe(true);

    const jumper = raidOn(base, { hopper: 1 });
    drop(jumper, "hopper", 1, 4);
    run(jumper, 6);
    expect(
      jumper.targets.every((t) => t.kind !== "wall" || t.hp === t.maxHp),
    ).toBe(true);
    expect(jumper.troops[0]?.x).toBeGreaterThan(6);
  });

  it("ends when time runs out", () => {
    const r = raidOn(starterBase(0), { fuzzball: 1 });
    run(r, RAID_SECONDS + 1);
    expect(r.outcome).toBe("done");
  });

  it("wins more trophies against someone further up", () => {
    expect(trophyChange(3, 100, 900)).toBeGreaterThan(
      trophyChange(3, 100, 100),
    );
    expect(trophyChange(0, 100, 100)).toBeLessThan(0);
  });
});

describe("saved progress", () => {
  it("survives odd stored data", () => {
    expect(parseClash("not json", me, 0).trophies).toBe(0);
    const odd = parseClash(
      JSON.stringify({
        trophies: -4,
        wallet: { coins: "x" },
        base: { buildings: [{ kind: "nope" }] },
      }),
      me,
      0,
    );
    expect(odd.trophies).toBe(0);
    expect(odd.base.buildings.some((b) => b.kind === "office")).toBe(true);
  });

  it("keeps a base in storage", () => {
    const c = getClash(me);
    build(c.base, c.wallet, "press", 2, 2, 0);
    saveClash(me, c);
    resetClashCache();
    expect(
      getClash(me).base.buildings.filter((b) => b.kind === "press"),
    ).toHaveLength(2);
  });

  it("tells the same story of raids while away on every reload", () => {
    const c = freshClash(me, 0);
    const later = 6 * 60 * MINUTE;
    expect(raidsWhileAway(c, me, later)).toEqual(raidsWhileAway(c, me, later));
    const found = welcomeBack(c, me, later);
    expect(found.length).toBeLessThanOrEqual(3);
    expect(c.seen).toBe(later);
    expect(raidsWhileAway(c, me, later)).toHaveLength(0);
  });

  it("ranks everyone by trophies, with the player on the board", () => {
    const rows = trophyBoard(me);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]?.trophies).toBeGreaterThanOrEqual(
        rows[i]?.trophies ?? 0,
      );
    }
    expect(rows.some((r) => r.email === me.email)).toBe(true);
  });
});
