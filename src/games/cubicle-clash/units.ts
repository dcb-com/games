import type { CritterKind } from "~/games/desk-defense/units";

// Cubicle Clash: every building and troop, and the numbers that balance
// them. Tuning the game means changing this file.
//
// Distances are in tiles and times in seconds. A building takes one tile,
// except the head office, which takes two by two.

export type BuildingKind =
  | "office"
  | "press"
  | "coffee"
  | "vault"
  | "breakroom"
  | "stapler"
  | "fan"
  | "printer"
  | "lamp"
  | "wall";

export type Role = "core" | "resource" | "army" | "defense" | "wall";

export interface BuildingDef {
  kind: BuildingKind;
  name: string;
  blurb: string;
  role: Role;
  size: 1 | 2;
  hp: number;
  // Coins for level 1. Each level costs more, see costFor.
  cost: number;
  // How many you may have at each head office level, 1 to 5.
  limit: [number, number, number, number, number];
  // Defenses: reach in tiles, damage per shot, seconds between shots.
  range: number;
  damage: number;
  every: number;
  // A shot hits everything within this many tiles of where it lands.
  splash: number;
  slows: boolean;
}

export const BUILDINGS: Record<BuildingKind, BuildingDef> = {
  office: {
    kind: "office",
    name: "Head office",
    blurb: "The heart of your base. Its level sets what you can build.",
    role: "core",
    size: 2,
    hp: 1800,
    cost: 0,
    limit: [1, 1, 1, 1, 1],
    range: 0,
    damage: 0,
    every: 0,
    splash: 0,
    slows: false,
  },
  press: {
    kind: "press",
    name: "Coin press",
    blurb: "Presses coins while you work. Collect them to build.",
    role: "resource",
    size: 1,
    hp: 400,
    cost: 60,
    limit: [2, 3, 4, 5, 6],
    range: 0,
    damage: 0,
    every: 0,
    splash: 0,
    slows: false,
  },
  coffee: {
    kind: "coffee",
    name: "Coffee maker",
    blurb: "Brews coffee. Troops are trained with coffee.",
    role: "resource",
    size: 1,
    hp: 400,
    cost: 60,
    limit: [2, 3, 4, 5, 6],
    range: 0,
    damage: 0,
    every: 0,
    splash: 0,
    slows: false,
  },
  vault: {
    kind: "vault",
    name: "Vault",
    blurb: "Holds more coins, and is tough to crack.",
    role: "resource",
    size: 1,
    hp: 900,
    cost: 150,
    limit: [1, 1, 2, 2, 3],
    range: 0,
    damage: 0,
    every: 0,
    splash: 0,
    slows: false,
  },
  breakroom: {
    kind: "breakroom",
    name: "Break room",
    blurb:
      "Where your crew waits. Each level adds room, makes troops stronger, and trains new ones.",
    role: "army",
    size: 1,
    hp: 600,
    cost: 120,
    limit: [1, 1, 2, 2, 2],
    range: 0,
    damage: 0,
    every: 0,
    splash: 0,
    slows: false,
  },
  stapler: {
    kind: "stapler",
    name: "Stapler turret",
    blurb: "Fires staples at the nearest troop.",
    role: "defense",
    size: 1,
    hp: 650,
    cost: 100,
    limit: [2, 3, 4, 5, 6],
    range: 3.6,
    damage: 16,
    every: 0.8,
    splash: 0,
    slows: false,
  },
  fan: {
    kind: "fan",
    name: "Desk fan",
    blurb: "Cold puffs that slow troops down.",
    role: "defense",
    size: 1,
    hp: 550,
    cost: 140,
    limit: [1, 1, 2, 2, 3],
    range: 3,
    damage: 7,
    every: 1,
    splash: 0,
    slows: true,
  },
  printer: {
    kind: "printer",
    name: "Printer",
    blurb: "Throws paper planes that hit every troop where they land.",
    role: "defense",
    size: 1,
    hp: 650,
    cost: 260,
    limit: [0, 1, 1, 2, 2],
    range: 4.2,
    damage: 22,
    every: 1.8,
    splash: 1,
    slows: false,
  },
  lamp: {
    kind: "lamp",
    name: "Desk lamp",
    blurb: "Long reach and a big zap, but slow to charge.",
    role: "defense",
    size: 1,
    hp: 650,
    cost: 420,
    limit: [0, 0, 1, 1, 2],
    range: 5.2,
    damage: 70,
    every: 2.6,
    splash: 0,
    slows: false,
  },
  wall: {
    kind: "wall",
    name: "Cubicle wall",
    blurb: "Troops must break through it. Hoppers jump it.",
    role: "wall",
    size: 1,
    hp: 320,
    cost: 10,
    limit: [10, 18, 26, 34, 42],
    range: 0,
    damage: 0,
    every: 0,
    splash: 0,
    slows: false,
  },
};

// The build bar, in order. The head office is never built, only upgraded.
export const BUILD_ORDER: BuildingKind[] = [
  "press",
  "coffee",
  "vault",
  "breakroom",
  "stapler",
  "fan",
  "printer",
  "lamp",
  "wall",
];

export const MAX_LEVEL = 5;

// Coins to upgrade the head office to each level.
export const OFFICE_COSTS = [0, 400, 1100, 2400, 4500];

// Each level is a third stronger than the one before.
export function levelScale(level: number): number {
  return 1 + 0.35 * (level - 1);
}

// Coins to build a level 1 building, or to raise one to `level`.
export function costFor(kind: BuildingKind, level: number): number {
  if (kind === "office") return OFFICE_COSTS[level - 1] ?? 0;
  return Math.round(BUILDINGS[kind].cost * level ** 1.6);
}

// What a coin press or coffee maker makes, per minute, and how much it holds
// before it must be collected.
export function makesPerMinute(level: number): number {
  return 6 * level;
}
export function holds(level: number): number {
  return 90 * level;
}

// How many coins and how much coffee the base can keep.
export function coinRoom(office: number, vaults: number[]): number {
  return 600 * office + vaults.reduce((sum, level) => sum + 900 * level, 0);
}
export function coffeeRoom(office: number): number {
  return 500 + 400 * office;
}

// Room for troops, from every break room's level.
export function armyRoom(breakrooms: number[]): number {
  return breakrooms.reduce((sum, level) => sum + 10 + 5 * level, 0);
}

export type TroopKind = Extract<
  CritterKind,
  "fuzzball" | "zippy" | "chonk" | "hopper" | "grumble"
>;

export interface TroopDef {
  kind: TroopKind;
  name: string;
  blurb: string;
  // How much break room space it takes.
  space: number;
  // Coffee to train one.
  cost: number;
  hp: number;
  // Damage per second.
  dps: number;
  speed: number;
  // What it goes for first.
  goesFor: Role | "any";
  // Walls do not stop it.
  jumps: boolean;
  // The break room level that trains it.
  unlock: number;
}

export const TROOPS: Record<TroopKind, TroopDef> = {
  fuzzball: {
    kind: "fuzzball",
    name: "Fuzzball",
    blurb: "Goes for the nearest building of any kind.",
    space: 1,
    cost: 10,
    hp: 70,
    dps: 12,
    speed: 1.2,
    goesFor: "any",
    jumps: false,
    unlock: 1,
  },
  zippy: {
    kind: "zippy",
    name: "Zippy",
    blurb: "Fast. Runs for coin presses, coffee makers and vaults.",
    space: 1,
    cost: 15,
    hp: 40,
    dps: 14,
    speed: 2.2,
    goesFor: "resource",
    jumps: false,
    unlock: 1,
  },
  hopper: {
    kind: "hopper",
    name: "Hopper",
    blurb: "Jumps over cubicle walls.",
    space: 2,
    cost: 30,
    hp: 110,
    dps: 16,
    speed: 1.4,
    goesFor: "any",
    jumps: true,
    unlock: 2,
  },
  chonk: {
    kind: "chonk",
    name: "Chonk",
    blurb: "Big and tough. Walks straight to the defenses.",
    space: 4,
    cost: 50,
    hp: 480,
    dps: 18,
    speed: 0.8,
    goesFor: "defense",
    jumps: false,
    unlock: 2,
  },
  grumble: {
    kind: "grumble",
    name: "Grumble",
    blurb: "The boss joins your side. Huge, slow and very strong.",
    space: 10,
    cost: 160,
    hp: 1600,
    dps: 60,
    speed: 0.7,
    goesFor: "any",
    jumps: false,
    unlock: 3,
  },
};

export const TROOP_ORDER: TroopKind[] = [
  "fuzzball",
  "zippy",
  "hopper",
  "chonk",
  "grumble",
];

// A raid lasts this long at most.
export const RAID_SECONDS = 75;

// The board: 16 by 8 tiles. Buildings go only inside the edge ring; troops
// are dropped on any open tile not next to a building.
export const COLS = 16;
export const ROWS = 8;
