import type { CritterKind, HelperKind } from "~/games/desk-defense/units";
import {
  CRITTER_ORDER,
  CRITTERS,
  HELPER_ORDER,
  HELPERS,
  START_ENERGY,
} from "~/games/desk-defense/units";

// Two hundred levels in four worlds of fifty. Level 1 is the guided one,
// where Dot, the desk robot, walks the player through a round. After it,
// each level brings a few more critters with a little more health, and now
// and then a new helper or a new kind of critter. Every world has its own
// look and its own twist. Every twentieth level is a bonus game instead: a
// short, one-off game of its own (see bonus/). Levels ending in 10, 30, 50,
// 70 and 90 end with Grumble, the boss.
//
// Levels are built from a fixed seed, so level 12 is the same round every
// time and a best score means the same thing for everyone.

export const ROWS = 5;
export const COLS = 9;
export const LEVEL_COUNT = 200;
export const WORLD_SIZE = 50;

export type Theme = "office" | "breakroom" | "server" | "rooftop";

export interface World {
  theme: Theme;
  name: string;
  // What is different about playing here, in one line.
  twist: string;
}

export const WORLDS: World[] = [
  { theme: "office", name: "The Office", twist: "Where it all starts." },
  {
    theme: "breakroom",
    name: "The Break Room",
    twist: "Spilled coffee: critters slide across puddles twice as fast.",
  },
  {
    theme: "server",
    name: "The Server Room",
    twist: "Glowing cables: helpers set on a cable work a third faster.",
  },
  {
    theme: "rooftop",
    name: "The Rooftop",
    twist: "Wind: every so often a gust blows every critter back.",
  },
];

export type BonusId =
  | "whack"
  | "gallery"
  | "catch"
  | "memory"
  | "dash"
  | "plane"
  | "snake"
  | "sort"
  | "beat"
  | "showdown";

// The bonus game on each twentieth level, in order.
export const BONUS_ORDER: BonusId[] = [
  "whack",
  "gallery",
  "catch",
  "memory",
  "dash",
  "plane",
  "snake",
  "sort",
  "beat",
  "showdown",
];

export function bonusAt(n: number): BonusId | null {
  if (n % 20 !== 0) return null;
  return BONUS_ORDER[n / 20 - 1] ?? null;
}

export function worldOf(n: number): World {
  const w =
    WORLDS[Math.min(WORLDS.length - 1, Math.floor((n - 1) / WORLD_SIZE))];
  return w ?? { theme: "office", name: "The Office", twist: "" };
}

export interface Spawn {
  // Seconds after the round starts.
  at: number;
  row: number;
  kind: CritterKind;
}

export interface Cell {
  row: number;
  col: number;
}

export interface Level {
  number: number;
  name: string;
  theme: Theme;
  // The rows critters walk down. The others are shown but closed.
  rows: number[];
  helpers: HelperKind[];
  startEnergy: number;
  // Critter health grows a little with every level.
  hpScale: number;
  spawns: Spawn[];
  // When the last, biggest wave comes, for the progress bar.
  bigWaveAt: number;
  guided: boolean;
  // A bonus game in place of a round. Its spawns are empty.
  bonus: BonusId | null;
  // The world's twist: puddles critters slide over, cables that power up
  // helpers, and how often the wind blows (0 for never).
  puddles: Cell[];
  cables: Cell[];
  windEvery: number;
}

// The first world keeps the names it has always had.
const OFFICE_NAMES = [
  "First day",
  "Three desks",
  "Open plan",
  "Inbox zero",
  "Coffee run",
  "Cold snap",
  "Something fuzzy",
  "Late lunch",
  "Quarter end",
  "The big one",
  "Fresh paper",
  "Hop to it",
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
  "The big grumble",
  "New year",
  "Hard reset",
  "No more coffee",
  "Every desk",
  "Last stand",
  "Lights out",
];

// Later names are built from two short lists per world.
const NAME_PARTS: Record<Theme, [string[], string[]]> = {
  office: [
    ["Busy", "Quiet", "Late", "Early", "Long", "Last", "Big", "Odd"],
    [
      "Monday",
      "memo",
      "meeting",
      "deadline",
      "inbox",
      "Friday",
      "review",
      "stapler",
    ],
  ],
  breakroom: [
    ["Spilled", "Cold", "Burnt", "Sticky", "Iced", "Sweet", "Stale", "Fresh"],
    [
      "latte",
      "donut",
      "kettle",
      "fridge",
      "muffin",
      "espresso",
      "toast",
      "biscuit",
    ],
  ],
  server: [
    [
      "Blinking",
      "Humming",
      "Tangled",
      "Hot",
      "Blue",
      "Midnight",
      "Lost",
      "Backed up",
    ],
    ["cable", "rack", "router", "fan", "reboot", "server", "packet", "patch"],
  ],
  rooftop: [
    [
      "Windy",
      "Sunny",
      "Rainy",
      "Breezy",
      "Golden",
      "Cloudy",
      "Starry",
      "Bright",
    ],
    [
      "garden",
      "skyline",
      "sunset",
      "planter",
      "pigeon",
      "rooftop",
      "breeze",
      "view",
    ],
  ],
};

const BONUS_NAMES: Record<BonusId, string> = {
  whack: "Whack-a-Critter",
  gallery: "Staple Gallery",
  catch: "Coffee Catch",
  memory: "Sticky Memory",
  dash: "Dot's Dash",
  plane: "Paper Plane",
  snake: "Shredder Snake",
  sort: "Critter Sort",
  beat: "Stamp Beat",
  showdown: "Grumble Showdown",
};

export function bonusName(id: BonusId): string {
  return BONUS_NAMES[id];
}

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

function levelName(n: number): string {
  const bonus = bonusAt(n);
  if (bonus) return BONUS_NAMES[bonus];
  const old = OFFICE_NAMES[n - 1];
  if (old) return old;
  const random = seeded(n * 104729);
  const [first, second] = NAME_PARTS[worldOf(n).theme];
  const a = first[Math.floor(random() * first.length)] ?? "Busy";
  const b = second[Math.floor(random() * second.length)] ?? "day";
  return `${a} ${b}`;
}

// How often each critter turns up, once it has been met.
const WEIGHTS: Record<CritterKind, number> = {
  fuzzball: 5,
  zippy: 3,
  chonk: 3,
  splitter: 2,
  mini: 0,
  hopper: 2,
  shellby: 2,
  grumble: 0,
};

// Grumble comes at the end of levels ending in 10, 30, 50, 70 and 90, and
// from level 70 on he brings a twin.
function bossesAt(n: number): number {
  if (n % 20 !== 10) return 0;
  return n < 70 ? 1 : 2;
}

function rowsFor(n: number): number[] {
  if (n === 1) return [2];
  if (n === 2) return [1, 2, 3];
  return [0, 1, 2, 3, 4];
}

function guidedLevel(): Level {
  return {
    number: 1,
    name: levelName(1),
    theme: "office",
    rows: [2],
    helpers: ["coffee", "stapler"],
    startEnergy: 150,
    hpScale: 1,
    spawns: [20, 34, 44, 52, 58, 62].map((at) => ({
      at,
      row: 2,
      kind: "fuzzball",
    })),
    bigWaveAt: 58,
    guided: true,
    bonus: null,
    puddles: [],
    cables: [],
    windEvery: 0,
  };
}

function bonusLevel(n: number, bonus: BonusId): Level {
  return {
    number: n,
    name: levelName(n),
    theme: worldOf(n).theme,
    rows: [],
    helpers: [],
    startEnergy: 0,
    hpScale: 1,
    spawns: [],
    bigWaveAt: 0,
    guided: false,
    bonus,
    puddles: [],
    cables: [],
    windEvery: 0,
  };
}

// Critter health for level n. It climbs steadily, a little slower after
// the first world, so upgrades can keep up.
export function healthFor(n: number): number {
  if (n <= 36) return 1 + (n - 1) * 0.018;
  return 1.63 + (n - 36) * 0.0125;
}

// How many critters come, before any bosses. It grows quickly at first,
// then slowly, so a round still fits in two minutes.
export function countFor(n: number): number {
  return Math.round(Math.min(5 + n * 0.9, 34 + n * 0.12));
}

export function buildLevel(n: number): Level {
  if (n <= 1) return guidedLevel();
  const bonus = bonusAt(n);
  if (bonus) return bonusLevel(n, bonus);
  const random = seeded(n * 7919);
  const rows = rowsFor(n);
  const world = worldOf(n);

  // Rows are dealt like cards: each open row gets a critter before any row
  // gets a second one. Pure chance can pile half a level into one row.
  let bag: number[] = [];
  const nextRow = (): number => {
    if (bag.length === 0) bag = [...rows];
    const i = Math.floor(random() * bag.length);
    const [row] = bag.splice(i, 1);
    return row ?? rows[0] ?? 2;
  };

  const kinds = CRITTER_ORDER.filter(
    (k) => WEIGHTS[k] > 0 && CRITTERS[k].unlockLevel <= n,
  );
  const total = kinds.reduce((sum, k) => sum + WEIGHTS[k], 0);
  const kindAt = (): CritterKind => {
    let roll = random() * total;
    for (const k of kinds) {
      roll -= WEIGHTS[k];
      if (roll <= 0) return k;
    }
    return "fuzzball";
  };

  const count = countFor(n);
  const firstAt = n < 5 ? 18 : 15;
  const lastAt = firstAt + Math.min(36 + n, 52);
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
  for (let i = 0; i < bossesAt(n); i++) {
    spawns.push({ at: bigWaveAt + 2 + i * 3, row: nextRow(), kind: "grumble" });
  }
  spawns.sort((a, b) => a.at - b.at);

  // The world's twist, laid out from the same seed.
  const spots = (count: number, cols: [number, number]): Cell[] => {
    const cells: Cell[] = [];
    for (let i = 0; i < count; i++) {
      const row = rows[Math.floor(random() * rows.length)] ?? 2;
      const col = cols[0] + Math.floor(random() * (cols[1] - cols[0] + 1));
      if (!cells.some((c) => c.row === row && c.col === col))
        cells.push({ row, col });
    }
    return cells;
  };

  return {
    number: n,
    name: levelName(n),
    theme: world.theme,
    rows,
    helpers: HELPER_ORDER.filter((k) => HELPERS[k].unlockLevel <= n),
    startEnergy: START_ENERGY,
    hpScale: healthFor(n),
    spawns,
    bigWaveAt,
    guided: false,
    bonus: null,
    puddles: world.theme === "breakroom" ? spots(4, [3, 8]) : [],
    cables: world.theme === "server" ? spots(5, [0, 5]) : [],
    windEvery: world.theme === "rooftop" ? 14 : 0,
  };
}

// What a level brings that the one before it did not, for the level card.
export type NewThing =
  | { type: "helper"; kind: HelperKind }
  | { type: "critter"; kind: CritterKind; boss: boolean };

export function newIn(n: number): NewThing[] {
  if (bonusAt(n)) return [];
  const helpers = HELPER_ORDER.filter((k) => HELPERS[k].unlockLevel === n).map(
    (kind): NewThing => ({ type: "helper", kind }),
  );
  const critters = CRITTER_ORDER.filter(
    (k) => n > 1 && CRITTERS[k].unlockLevel === n,
  ).map((kind): NewThing => ({ type: "critter", kind, boss: false }));
  const boss: NewThing[] =
    bossesAt(n) > 0 ? [{ type: "critter", kind: "grumble", boss: true }] : [];
  return [...helpers, ...critters, ...boss];
}
