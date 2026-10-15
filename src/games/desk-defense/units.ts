// The helpers a player places and the bugs that come at them. Every number
// that sets the balance of a round lives here, so tuning the game means
// changing this file and nothing else.
//
// Distances are in grid cells and times in seconds. A bug at speed 0.3
// crosses the nine-cell desk in about thirty seconds.

export type HelperKind =
  | "coffee"
  | "stapler"
  | "firewall"
  | "fan"
  | "printer"
  | "eraser";

export type BugKind = "bug" | "spam" | "virus" | "phish" | "trojan" | "ransom";

export interface HelperDef {
  kind: HelperKind;
  name: string;
  // One line for the card and the guide.
  blurb: string;
  cost: number;
  hp: number;
  // Seconds before the same card can be played again.
  recharge: number;
  // The level where the card first shows up.
  unlockLevel: number;
  // Seconds between shots, or between energy drops for a maker.
  every: number;
  damage: number;
  // How many staples leave with each shot.
  shots: number;
  slows: boolean;
  makesEnergy: number;
  // An eraser clears the cells around it once, then is gone.
  burst: number;
}

export const HELPERS: Record<HelperKind, HelperDef> = {
  coffee: {
    kind: "coffee",
    name: "Coffee maker",
    blurb: "Brews 25 energy now and then.",
    cost: 50,
    hp: 300,
    recharge: 5,
    unlockLevel: 1,
    every: 9,
    damage: 0,
    shots: 0,
    slows: false,
    makesEnergy: 25,
    burst: 0,
  },
  stapler: {
    kind: "stapler",
    name: "Stapler",
    blurb: "Fires staples down its row.",
    cost: 100,
    hp: 300,
    recharge: 5,
    unlockLevel: 1,
    every: 1.4,
    damage: 20,
    shots: 1,
    slows: false,
    makesEnergy: 0,
    burst: 0,
  },
  firewall: {
    kind: "firewall",
    name: "Firewall",
    blurb: "A tough wall. Bugs chew on it for a long time.",
    cost: 50,
    hp: 2000,
    recharge: 20,
    unlockLevel: 3,
    every: 0,
    damage: 0,
    shots: 0,
    slows: false,
    makesEnergy: 0,
    burst: 0,
  },
  fan: {
    kind: "fan",
    name: "Desk fan",
    blurb: "Cold air. Hits and slows bugs by half.",
    cost: 175,
    hp: 300,
    recharge: 7,
    unlockLevel: 6,
    every: 1.4,
    damage: 20,
    shots: 1,
    slows: true,
    makesEnergy: 0,
    burst: 0,
  },
  printer: {
    kind: "printer",
    name: "Printer",
    blurb: "Fires two pages at a time.",
    cost: 200,
    hp: 300,
    recharge: 7,
    unlockLevel: 10,
    every: 1.4,
    damage: 20,
    shots: 2,
    slows: false,
    makesEnergy: 0,
    burst: 0,
  },
  eraser: {
    kind: "eraser",
    name: "Big eraser",
    blurb: "Wipes out every bug in the cells around it.",
    cost: 150,
    hp: 9999,
    recharge: 30,
    unlockLevel: 14,
    every: 0.8,
    damage: 0,
    shots: 0,
    slows: false,
    makesEnergy: 0,
    burst: 1800,
  },
};

export const HELPER_ORDER: HelperKind[] = [
  "coffee",
  "stapler",
  "firewall",
  "fan",
  "printer",
  "eraser",
];

export interface BugDef {
  kind: BugKind;
  name: string;
  blurb: string;
  hp: number;
  speed: number;
  // Damage per second while it chews on a helper.
  bite: number;
  points: number;
  unlockLevel: number;
  // A phish jumps over the first helper in its way.
  hops: boolean;
}

export const BUG_ORDER: BugKind[] = [
  "bug",
  "spam",
  "virus",
  "phish",
  "trojan",
  "ransom",
];

export const BUGS: Record<BugKind, BugDef> = {
  bug: {
    kind: "bug",
    name: "Bug",
    blurb: "Slow and steady.",
    hp: 190,
    speed: 0.3,
    bite: 50,
    points: 10,
    unlockLevel: 1,
    hops: false,
  },
  spam: {
    kind: "spam",
    name: "Spam",
    blurb: "Weak but fast.",
    hp: 110,
    speed: 0.62,
    bite: 40,
    points: 15,
    unlockLevel: 4,
    hops: false,
  },
  virus: {
    kind: "virus",
    name: "Virus",
    blurb: "Takes three times the hits of a bug.",
    hp: 560,
    speed: 0.26,
    bite: 60,
    points: 25,
    unlockLevel: 7,
    hops: false,
  },
  phish: {
    kind: "phish",
    name: "Phish",
    blurb: "Jumps over the first helper in its row.",
    hp: 320,
    speed: 0.5,
    bite: 50,
    points: 30,
    unlockLevel: 12,
    hops: true,
  },
  trojan: {
    kind: "trojan",
    name: "Trojan",
    blurb: "Heavy armor. Bring a lot of staples.",
    hp: 1100,
    speed: 0.22,
    bite: 80,
    points: 40,
    unlockLevel: 17,
    hops: false,
  },
  ransom: {
    kind: "ransom",
    name: "Ransomware",
    blurb: "The boss. Huge, slow, and hungry.",
    hp: 3000,
    speed: 0.2,
    bite: 250,
    points: 250,
    unlockLevel: 10,
    hops: false,
  },
};

// The energy every round starts with, and the slow drip that comes in
// without any coffee makers.
export const START_ENERGY = 50;
export const DRIP_EVERY = 8;
export const DRIP_AMOUNT = 25;
