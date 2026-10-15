import type { BugKind, HelperKind } from "~/games/desk-defense/units";
import {
  BUG_ORDER,
  BUGS,
  HELPER_ORDER,
  HELPERS,
  START_ENERGY,
} from "~/games/desk-defense/units";

// Thirty-six levels. Level 1 is the guided one, where Dot, the desk robot,
// walks the player through a round. After it, each level brings a few more
// bugs, a little more health on each, and now and then a new helper or a
// new kind of bug. Levels 10, 20, 30 and 36 end with Ransomware, the boss.
//
// Levels are built from a fixed seed, so level 12 is the same round every
// time and a best score means the same thing for everyone.

export const ROWS = 5;
export const COLS = 9;

export interface Spawn {
  // Seconds after the round starts.
  at: number;
  row: number;
  kind: BugKind;
}

export interface Level {
  number: number;
  name: string;
  // The rows bugs walk down. The others are shown but closed.
  rows: number[];
  helpers: HelperKind[];
  startEnergy: number;
  // Bug health grows a little with every level.
  hpScale: number;
  spawns: Spawn[];
  // When the last, biggest wave comes, for the progress bar.
  bigWaveAt: number;
  guided: boolean;
}

const NAMES = [
  "First day",
  "Three desks",
  "Open plan",
  "Inbox zero",
  "Coffee run",
  "Cold snap",
  "Something viral",
  "Late lunch",
  "Quarter end",
  "The big one",
  "Fresh paper",
  "Gone phishing",
  "Reply all",
  "Clean slate",
  "Audit week",
  "All hands",
  "Gifts bearing",
  "Overtime",
  "Patch Tuesday",
  "Locked out",
  "Back to work",
  "Night shift",
  "Paper jam",
  "Full queue",
  "Holiday rush",
  "Server room",
  "Year end",
  "Long weekend",
  "Final notice",
  "Pay the ransom",
  "New year",
  "Hard reset",
  "No more coffee",
  "Every desk",
  "Last stand",
  "Lights out",
];

export const LEVEL_COUNT = NAMES.length;

// A small seeded random number source, so a level is the same every time.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEIGHTS: Record<BugKind, number> = {
  bug: 5,
  spam: 3,
  virus: 3,
  phish: 2,
  trojan: 2,
  ransom: 0,
};

const BOSSES: Record<number, number> = { 10: 1, 20: 1, 30: 2, 36: 3 };

function rowsFor(n: number): number[] {
  if (n === 1) return [2];
  if (n === 2) return [1, 2, 3];
  return [0, 1, 2, 3, 4];
}

function guidedLevel(): Level {
  return {
    number: 1,
    name: NAMES[0] ?? "First day",
    rows: [2],
    helpers: ["coffee", "stapler"],
    startEnergy: 150,
    hpScale: 1,
    spawns: [20, 34, 44, 52, 58, 62].map((at) => ({
      at,
      row: 2,
      kind: "bug",
    })),
    bigWaveAt: 58,
    guided: true,
  };
}

export function buildLevel(n: number): Level {
  if (n <= 1) return guidedLevel();
  const random = seeded(n * 7919);
  const rows = rowsFor(n);

  // Rows are dealt like cards: each open row gets a bug before any row
  // gets a second one. Pure chance can pile half a level into one row.
  let bag: number[] = [];
  const nextRow = (): number => {
    if (bag.length === 0) bag = [...rows];
    const i = Math.floor(random() * bag.length);
    const [row] = bag.splice(i, 1);
    return row ?? rows[0] ?? 2;
  };

  const kinds = BUG_ORDER.filter(
    (k) => WEIGHTS[k] > 0 && BUGS[k].unlockLevel <= n,
  );
  const total = kinds.reduce((sum, k) => sum + WEIGHTS[k], 0);
  const kindAt = (): BugKind => {
    let roll = random() * total;
    for (const k of kinds) {
      roll -= WEIGHTS[k];
      if (roll <= 0) return k;
    }
    return "bug";
  };

  const count = Math.round(5 + n * 0.9);
  const firstAt = n < 5 ? 18 : 15;
  const lastAt = firstAt + Math.min(36 + n, 60);
  const steady = Math.ceil(count * 0.7);
  const spawns: Spawn[] = [];
  for (let i = 0; i < steady; i++) {
    const at = firstAt + ((lastAt - firstAt) * i) / steady + random() * 2;
    spawns.push({ at, row: nextRow(), kind: kindAt() });
  }
  const bigWaveAt = lastAt + 6;
  for (let i = 0; i < count - steady; i++) {
    spawns.push({
      at: bigWaveAt + random() * 5,
      row: nextRow(),
      kind: kindAt(),
    });
  }
  for (let i = 0; i < (BOSSES[n] ?? 0); i++) {
    spawns.push({ at: bigWaveAt + 2 + i * 3, row: nextRow(), kind: "ransom" });
  }
  spawns.sort((a, b) => a.at - b.at);

  return {
    number: n,
    name: NAMES[n - 1] ?? `Level ${n}`,
    rows,
    helpers: HELPER_ORDER.filter((k) => HELPERS[k].unlockLevel <= n),
    startEnergy: START_ENERGY,
    hpScale: 1 + (n - 1) * 0.018,
    spawns,
    bigWaveAt,
    guided: false,
  };
}

// What a level brings that the one before it did not, for the level card.
export function newIn(n: number): string[] {
  const helpers = HELPER_ORDER.filter((k) => HELPERS[k].unlockLevel === n).map(
    (k) => `New helper: ${HELPERS[k].name}`,
  );
  const bugs = BUG_ORDER.filter(
    (k) => k !== "ransom" && n > 1 && BUGS[k].unlockLevel === n,
  ).map((k) => `New bug: ${BUGS[k].name}`);
  const boss = BOSSES[n] ? ["Boss: Ransomware"] : [];
  return [...helpers, ...bugs, ...boss];
}
