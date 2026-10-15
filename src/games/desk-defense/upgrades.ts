// What coins buy. Coins come from playing: every bug knocked out pays a
// little, and a cleared level pays more. Each upgrade has a few steps, and
// each step costs more than the one before.

export type UpgradeId = "energy" | "coffee" | "staples" | "tough" | "quick";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  // What one step does, said plainly.
  perStep: string;
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "energy",
    name: "Head start",
    perStep: "+25 energy at the start of a round.",
    costs: [60, 140, 260, 420, 640],
  },
  {
    id: "coffee",
    name: "Strong coffee",
    perStep: "Coffee makers brew 10% faster.",
    costs: [80, 180, 320, 500, 750],
  },
  {
    id: "staples",
    name: "Heavy staples",
    perStep: "Every shot hits 12% harder.",
    costs: [100, 220, 380, 600, 900],
  },
  {
    id: "tough",
    name: "Sturdy desks",
    perStep: "Helpers take 20% more chewing.",
    costs: [70, 160, 300, 480, 720],
  },
  {
    id: "quick",
    name: "Quick hands",
    perStep: "Cards are ready again 10% sooner.",
    costs: [120, 280, 520],
  },
];

export type Owned = Record<UpgradeId, number>;

export const NO_UPGRADES: Owned = {
  energy: 0,
  coffee: 0,
  staples: 0,
  tough: 0,
  quick: 0,
};

// The upgrades as numbers the round uses.
export interface Boosts {
  startEnergy: number;
  brewSpeed: number;
  damage: number;
  toughness: number;
  recharge: number;
}

export function boostsFrom(owned: Owned): Boosts {
  return {
    startEnergy: 25 * owned.energy,
    brewSpeed: 1 + 0.1 * owned.coffee,
    damage: 1 + 0.12 * owned.staples,
    toughness: 1 + 0.2 * owned.tough,
    recharge: 1 - 0.1 * owned.quick,
  };
}

export function nextCost(def: UpgradeDef, step: number): number | null {
  return def.costs[step] ?? null;
}
