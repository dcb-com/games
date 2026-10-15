// The helpers a player places and the critters that come at them. Every
// number that sets the balance of a round lives here, so tuning the game
// means changing this file and nothing else.
//
// Distances are in grid cells and times in seconds. A critter at speed 0.3
// crosses the nine-cell desk in about thirty seconds.

export type HelperKind =
  | "coffee"
  | "stapler"
  | "firewall"
  | "fan"
  | "sticky"
  | "printer"
  | "eraser"
  | "lamp";

export type CritterKind =
  | "fuzzball"
  | "zippy"
  | "chonk"
  | "splitter"
  | "mini"
  | "hopper"
  | "shellby"
  | "grumble";

export interface HelperDef {
  kind: HelperKind;
  name: string;
  // What it does, in one line, for the level card.
  blurb: string;
  // Its special move, in one line.
  special: string;
  cost: number;
  hp: number;
  // Seconds before the same card can be played again.
  recharge: number;
  // The level where the card first shows up.
  unlockLevel: number;
  // Seconds between shots, brews, zaps or the eraser's wipe.
  every: number;
  damage: number;
  // Critters walk over it instead of stopping to chew.
  flat: boolean;
}

export const HELPERS: Record<HelperKind, HelperDef> = {
  coffee: {
    kind: "coffee",
    name: "Coffee maker",
    blurb: "Brews 25 energy every few seconds.",
    special: "Its first cup comes quickly.",
    cost: 50,
    hp: 300,
    recharge: 5,
    unlockLevel: 1,
    every: 9,
    damage: 0,
    flat: false,
  },
  stapler: {
    kind: "stapler",
    name: "Stapler",
    blurb: "Fires staples down its row.",
    special:
      "Every fourth shot is a gold staple that hits three times as hard.",
    cost: 100,
    hp: 300,
    recharge: 5,
    unlockLevel: 1,
    every: 1.4,
    damage: 20,
    flat: false,
  },
  firewall: {
    kind: "firewall",
    name: "Firewall",
    blurb: "A tough wall that holds critters still.",
    special: "It is hot. Anything that chews on it gets burned.",
    cost: 50,
    hp: 2000,
    recharge: 20,
    unlockLevel: 3,
    every: 0,
    damage: 18,
    flat: false,
  },
  fan: {
    kind: "fan",
    name: "Desk fan",
    blurb: "Blows cold puffs that slow critters by half.",
    special: "Every eight seconds, a gust pushes its whole row back.",
    cost: 175,
    hp: 300,
    recharge: 7,
    unlockLevel: 6,
    every: 1.4,
    damage: 15,
    flat: false,
  },
  sticky: {
    kind: "sticky",
    name: "Sticky note",
    blurb: "A cheap trap. Critters that step on it get stuck.",
    special:
      "Critters walk over it. It holds three of them, then it is used up.",
    cost: 25,
    hp: 9999,
    recharge: 8,
    unlockLevel: 8,
    every: 0,
    damage: 0,
    flat: true,
  },
  printer: {
    kind: "printer",
    name: "Printer",
    blurb: "Folds paper planes and throws them.",
    special: "Each plane flies through up to three critters.",
    cost: 200,
    hp: 300,
    recharge: 7,
    unlockLevel: 10,
    every: 1.6,
    damage: 30,
    flat: false,
  },
  eraser: {
    kind: "eraser",
    name: "Big eraser",
    blurb: "Wipes out every critter in the cells around it.",
    special: "One use. It shakes, then wipes.",
    cost: 150,
    hp: 9999,
    recharge: 30,
    unlockLevel: 14,
    every: 0.8,
    damage: 1800,
    flat: true,
  },
  lamp: {
    kind: "lamp",
    name: "Desk lamp",
    blurb: "Charges up, then zaps a beam down its row.",
    special: "The beam hits every critter in front of it at once.",
    cost: 250,
    hp: 300,
    recharge: 10,
    unlockLevel: 22,
    every: 3.5,
    damage: 30,
    flat: false,
  },
};

export const HELPER_ORDER: HelperKind[] = [
  "coffee",
  "stapler",
  "firewall",
  "fan",
  "sticky",
  "printer",
  "eraser",
  "lamp",
];

export interface CritterDef {
  kind: CritterKind;
  name: string;
  blurb: string;
  hp: number;
  // A helmet takes hits before the critter does.
  armor: number;
  speed: number;
  // Damage per second while it chews on a helper.
  bite: number;
  points: number;
  // 0 for the boss and for minis, which never arrive on their own.
  unlockLevel: number;
  // How big it is drawn, against a fuzzball.
  scale: number;
}

export const CRITTERS: Record<CritterKind, CritterDef> = {
  fuzzball: {
    kind: "fuzzball",
    name: "Fuzzball",
    blurb: "A round pink puff. Slow and steady.",
    hp: 190,
    armor: 0,
    speed: 0.3,
    bite: 50,
    points: 10,
    unlockLevel: 1,
    scale: 1,
  },
  zippy: {
    kind: "zippy",
    name: "Zippy",
    blurb: "Small, yellow and very fast.",
    hp: 110,
    armor: 0,
    speed: 0.62,
    bite: 40,
    points: 15,
    unlockLevel: 4,
    scale: 0.85,
  },
  chonk: {
    kind: "chonk",
    name: "Chonk",
    blurb: "Big and purple. Takes three times the hits.",
    hp: 560,
    armor: 0,
    speed: 0.24,
    bite: 70,
    points: 25,
    unlockLevel: 7,
    scale: 1.2,
  },
  splitter: {
    kind: "splitter",
    name: "Splitter",
    blurb: "Pops into two minis when you stop it.",
    hp: 300,
    armor: 0,
    speed: 0.3,
    bite: 50,
    points: 20,
    unlockLevel: 9,
    scale: 1.05,
  },
  mini: {
    kind: "mini",
    name: "Mini",
    blurb: "Half of a splitter, and in a hurry.",
    hp: 80,
    armor: 0,
    speed: 0.5,
    bite: 30,
    points: 5,
    unlockLevel: 0,
    scale: 0.6,
  },
  hopper: {
    kind: "hopper",
    name: "Hopper",
    blurb: "Jumps clean over the first helper in its row.",
    hp: 320,
    armor: 0,
    speed: 0.45,
    bite: 50,
    points: 30,
    unlockLevel: 12,
    scale: 1,
  },
  shellby: {
    kind: "shellby",
    name: "Shellby",
    blurb: "Wears a pot for a helmet. Without it, it gets angry and fast.",
    hp: 450,
    armor: 650,
    speed: 0.22,
    bite: 70,
    points: 40,
    unlockLevel: 17,
    scale: 1.1,
  },
  grumble: {
    kind: "grumble",
    name: "Grumble",
    blurb: "The boss. At half health it roars and calls for help.",
    hp: 3000,
    armor: 0,
    speed: 0.2,
    bite: 250,
    points: 250,
    unlockLevel: 0,
    scale: 1.55,
  },
};

export const CRITTER_ORDER: CritterKind[] = [
  "fuzzball",
  "zippy",
  "chonk",
  "splitter",
  "mini",
  "hopper",
  "shellby",
  "grumble",
];

// The energy every round starts with, and the slow drip that comes in
// without any coffee makers.
export const START_ENERGY = 50;
export const DRIP_EVERY = 8;
export const DRIP_AMOUNT = 25;

// Special moves, in numbers.
export const POWER_EVERY = 4;
export const POWER_TIMES = 3;
export const GUST_EVERY = 8;
export const GUST_PUSH = 0.7;
export const STICKY_USES = 3;
export const STICKY_HOLD = 2.5;
export const PLANE_PIERCE = 3;
export const ANGRY_SPEED = 0.42;
