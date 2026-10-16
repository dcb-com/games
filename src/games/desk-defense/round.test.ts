import { describe, expect, it } from "vitest";

import { LEVEL_COUNT, buildLevel } from "~/games/desk-defense/levels";
import type { Round } from "~/games/desk-defense/round";
import { finalScore, newRound, place, step } from "~/games/desk-defense/round";
import type { CritterKind } from "~/games/desk-defense/units";
import { CRITTERS, HELPER_ORDER } from "~/games/desk-defense/units";
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
  it("has two hundred, and the first one is guided", () => {
    expect(LEVEL_COUNT).toBe(200);
    expect(buildLevel(1).guided).toBe(true);
    expect(buildLevel(2).guided).toBe(false);
  });

  it("gets harder as it goes, leaving out bonus games and bosses", () => {
    const rounds = Array.from({ length: LEVEL_COUNT - 2 }, (_, i) =>
      buildLevel(i + 3),
    ).filter((l) => !l.bonus);
    const plain = (l: (typeof rounds)[number]) =>
      l.spawns.filter((s) => s.kind !== "grumble").length;
    for (let i = 1; i < rounds.length; i++) {
      const a = rounds[i - 1];
      const b = rounds[i];
      if (!a || !b) continue;
      expect(plain(b)).toBeGreaterThanOrEqual(plain(a));
      expect(b.hpScale).toBeGreaterThan(a.hpScale);
    }
  });

  it("puts a bonus game on every twentieth level, each one different", () => {
    const bonuses = Array.from(
      { length: 10 },
      (_, i) => buildLevel((i + 1) * 20).bonus,
    );
    expect(bonuses.every((b) => b !== null)).toBe(true);
    expect(new Set(bonuses).size).toBe(10);
    expect(buildLevel(21).bonus).toBeNull();
  });

  it("changes world every fifty levels, each with its twist", () => {
    expect(buildLevel(50).theme).toBe("office");
    expect(buildLevel(51).theme).toBe("breakroom");
    expect(buildLevel(51).puddles.length).toBeGreaterThan(0);
    expect(buildLevel(101).theme).toBe("server");
    expect(buildLevel(101).cables.length).toBeGreaterThan(0);
    expect(buildLevel(151).theme).toBe("rooftop");
    expect(buildLevel(151).windEvery).toBeGreaterThan(0);
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

// A round with one open row and nothing scheduled, for trying one helper
// against one critter.
function bench(): Round {
  const level = { ...buildLevel(1), spawns: [], helpers: HELPER_ORDER };
  const r = newRound(level, plain);
  r.energy = 99999;
  return r;
}

function addCritter(r: Round, kind: CritterKind, x: number) {
  const def = CRITTERS[kind];
  r.critters.push({
    id: r.nextId++,
    kind,
    row: 2,
    x,
    hp: def.hp,
    maxHp: def.hp,
    armor: def.armor,
    maxArmor: def.armor,
    slowFor: 0,
    stuckFor: 0,
    stuckOn: 0,
    hopped: false,
    hop: null,
    chewing: false,
    flash: 0,
    burn: 0,
    angry: false,
    age: 0,
  });
  const c = r.critters.at(-1);
  if (!c) throw new Error("no critter");
  return c;
}

function tick(r: Round, seconds: number) {
  for (let t = 0; t < seconds; t += 0.05) step(r, 0.05);
}

describe("special moves", () => {
  it("fires a gold staple every fourth shot", () => {
    const r = bench();
    place(r, "stapler", 2, 0);
    addCritter(r, "chonk", 8.5);
    const kinds: string[] = [];
    for (let t = 0; t < 6; t += 0.05) {
      step(r, 0.05);
      for (const e of r.events) if (e.type === "fire") kinds.push(e.shot);
      r.events = [];
    }
    expect(kinds.slice(0, 4)).toEqual(["staple", "staple", "staple", "power"]);
  });

  it("splits a splitter into two minis", () => {
    const r = bench();
    const c = addCritter(r, "splitter", 6);
    c.hp = 1;
    place(r, "stapler", 2, 0);
    tick(r, 3);
    expect(r.critters.filter((m) => m.kind === "mini")).toHaveLength(2);
  });

  it("gets angry and fast when a helmet breaks", () => {
    const r = bench();
    const c = addCritter(r, "shellby", 6);
    c.armor = 1;
    place(r, "stapler", 2, 0);
    tick(r, 3);
    expect(c.armor).toBe(0);
    expect(c.angry).toBe(true);
  });

  it("holds critters on a sticky note, then uses it up", () => {
    const r = bench();
    place(r, "sticky", 2, 4);
    const c = addCritter(r, "fuzzball", 5.1);
    tick(r, 0.5);
    expect(c.stuckFor).toBeGreaterThan(0);
    const x = c.x;
    tick(r, 1);
    expect(c.x).toBe(x);
    addCritter(r, "fuzzball", 5.1);
    addCritter(r, "fuzzball", 5.12);
    tick(r, 1);
    expect(r.helpers.some((h) => h.kind === "sticky")).toBe(false);
  });

  it("hops over the first helper, then chews the next", () => {
    const r = bench();
    place(r, "firewall", 2, 6);
    r.cooldowns.firewall = 0;
    place(r, "firewall", 2, 4);
    const c = addCritter(r, "hopper", 7.2);
    tick(r, 4);
    expect(c.hopped).toBe(true);
    expect(c.x).toBeLessThan(6);
    expect(c.x).toBeGreaterThan(5);
  });

  it("pushes the row back with a gust", () => {
    const r = bench();
    const fan = place(r, "fan", 2, 0);
    expect(fan).toBe("placed");
    const c = addCritter(r, "chonk", 6);
    c.hp = 99999;
    c.maxHp = 99999;
    const h = r.helpers[0];
    if (!h) throw new Error("no fan");
    h.gust = 0;
    step(r, 0.05);
    expect(c.x).toBeGreaterThan(6.5);
  });

  it("burns a critter that chews a firewall", () => {
    const r = bench();
    place(r, "firewall", 2, 3);
    const c = addCritter(r, "fuzzball", 4.2);
    tick(r, 3);
    expect(c.hp).toBeLessThan(c.maxHp);
    expect(c.burn).toBeGreaterThan(0);
  });

  it("roars at half health and calls two fuzzballs", () => {
    const r = bench();
    const c = addCritter(r, "grumble", 8);
    c.hp = c.maxHp / 2 + 1;
    place(r, "stapler", 2, 0);
    tick(r, 3);
    expect(c.angry).toBe(true);
    expect(r.critters.filter((f) => f.kind === "fuzzball")).toHaveLength(2);
  });

  it("zaps every critter in front of a lamp at once", () => {
    const r = bench();
    place(r, "lamp", 2, 0);
    const a = addCritter(r, "chonk", 5);
    const b = addCritter(r, "chonk", 8);
    tick(r, 4);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(b.hp).toBeLessThan(b.maxHp);
  });

  it("lets a critter slide twice as fast over a puddle", () => {
    const dry = bench();
    const wet = bench();
    wet.level = { ...wet.level, puddles: [{ row: 2, col: 6 }] };
    const a = addCritter(dry, "fuzzball", 6.9);
    const b = addCritter(wet, "fuzzball", 6.9);
    tick(dry, 1);
    tick(wet, 1);
    expect(6.9 - b.x).toBeGreaterThan((6.9 - a.x) * 1.8);
  });

  it("powers up a helper on a cable", () => {
    const plain = bench();
    const powered = bench();
    powered.level = { ...powered.level, cables: [{ row: 2, col: 0 }] };
    for (const r of [plain, powered]) {
      place(r, "stapler", 2, 0);
      const c = addCritter(r, "chonk", 8);
      c.hp = 99999;
    }
    const shots = (r: Round) => {
      let n = 0;
      for (let t = 0; t < 10; t += 0.05) {
        step(r, 0.05);
        n += r.events.filter((e) => e.type === "fire").length;
        r.events = [];
      }
      return n;
    };
    expect(shots(powered)).toBeGreaterThan(shots(plain));
  });

  it("blows critters back when the wind comes", () => {
    const r = bench();
    r.level = { ...r.level, windEvery: 1 };
    const c = addCritter(r, "chonk", 5);
    tick(r, 1.02);
    expect(c.x).toBeGreaterThan(5);
  });
});
