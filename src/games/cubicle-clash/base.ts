import type { BuildingKind } from "~/games/cubicle-clash/units";
import {
  BUILDINGS,
  COLS,
  MAX_LEVEL,
  ROWS,
  armyRoom,
  coffeeRoom,
  coinRoom,
  costFor,
  holds,
  makesPerMinute,
} from "~/games/cubicle-clash/units";

// A player's base: what stands where, at what level, and the rules for
// building, moving, upgrading and collecting. Plain data, so it saves as is.

export interface Building {
  id: number;
  kind: BuildingKind;
  level: number;
  // The top-left tile.
  col: number;
  row: number;
  // For a coin press or coffee maker: when it was last emptied, in ms.
  since: number;
}

export interface Base {
  buildings: Building[];
  nextId: number;
}

export interface Wallet {
  coins: number;
  coffee: number;
}

// Buildings go only inside the edge ring, so there is always room around
// the outside to drop troops.
export function inside(col: number, row: number, size = 1): boolean {
  return (
    col >= 1 && row >= 1 && col + size <= COLS - 1 && row + size <= ROWS - 1
  );
}

export function covers(
  b: { col: number; row: number; kind: BuildingKind },
  col: number,
  row: number,
) {
  const size = BUILDINGS[b.kind].size;
  return (
    col >= b.col && col < b.col + size && row >= b.row && row < b.row + size
  );
}

export function buildingAt(base: Base, col: number, row: number) {
  return base.buildings.find((b) => covers(b, col, row));
}

export function officeLevel(base: Base): number {
  return base.buildings.find((b) => b.kind === "office")?.level ?? 1;
}

export function countOf(base: Base, kind: BuildingKind): number {
  return base.buildings.filter((b) => b.kind === kind).length;
}

export function limitOf(base: Base, kind: BuildingKind): number {
  return BUILDINGS[kind].limit[officeLevel(base) - 1] ?? 0;
}

function levelsOf(base: Base, kind: BuildingKind): number[] {
  return base.buildings.filter((b) => b.kind === kind).map((b) => b.level);
}

export function rooms(base: Base) {
  const office = officeLevel(base);
  return {
    coins: coinRoom(office, levelsOf(base, "vault")),
    coffee: coffeeRoom(office),
    army: armyRoom(levelsOf(base, "breakroom")),
  };
}

// The highest break room level, which sets the troops you can train.
export function breakroomLevel(base: Base): number {
  return Math.max(0, ...levelsOf(base, "breakroom"));
}

export function starterBase(now: number): Base {
  const list: Omit<Building, "id">[] = [
    { kind: "office", level: 1, col: 7, row: 3, since: now },
    { kind: "press", level: 1, col: 4, row: 2, since: now },
    { kind: "coffee", level: 1, col: 4, row: 5, since: now },
    { kind: "breakroom", level: 1, col: 11, row: 2, since: now },
    { kind: "stapler", level: 1, col: 10, row: 5, since: now },
  ];
  return {
    buildings: list.map((b, i) => ({ ...b, id: i + 1 })),
    nextId: list.length + 1,
  };
}

export type BuildResult = "built" | "full" | "taken" | "edge" | "coins";

function fits(
  base: Base,
  kind: BuildingKind,
  col: number,
  row: number,
  skip?: number,
) {
  const size = BUILDINGS[kind].size;
  if (!inside(col, row, size)) return "edge";
  for (let c = col; c < col + size; c++) {
    for (let r = row; r < row + size; r++) {
      const there = buildingAt(base, c, r);
      if (there && there.id !== skip) return "taken";
    }
  }
  return "ok";
}

export function canBuild(
  base: Base,
  wallet: Wallet,
  kind: BuildingKind,
  col: number,
  row: number,
): BuildResult {
  if (kind === "office" || countOf(base, kind) >= limitOf(base, kind))
    return "full";
  const room = fits(base, kind, col, row);
  if (room !== "ok") return room;
  if (wallet.coins < costFor(kind, 1)) return "coins";
  return "built";
}

export function build(
  base: Base,
  wallet: Wallet,
  kind: BuildingKind,
  col: number,
  row: number,
  now: number,
): BuildResult {
  const result = canBuild(base, wallet, kind, col, row);
  if (result !== "built") return result;
  wallet.coins -= costFor(kind, 1);
  base.buildings.push({
    id: base.nextId++,
    kind,
    level: 1,
    col,
    row,
    since: now,
  });
  return "built";
}

export function canMove(
  base: Base,
  b: Building,
  col: number,
  row: number,
): boolean {
  return fits(base, b.kind, col, row, b.id) === "ok";
}

export function move(
  base: Base,
  b: Building,
  col: number,
  row: number,
): boolean {
  if (!canMove(base, b, col, row)) return false;
  b.col = col;
  b.row = row;
  return true;
}

export type UpgradeResult = "upgraded" | "max" | "office" | "coins";

// The cost of the next level, or why there is none.
export function nextLevel(
  base: Base,
  b: Building,
): { cost: number } | { blocked: "max" | "office" } {
  if (b.level >= MAX_LEVEL) return { blocked: "max" };
  if (b.kind !== "office" && b.level >= officeLevel(base))
    return { blocked: "office" };
  return { cost: costFor(b.kind, b.level + 1) };
}

export function upgrade(
  base: Base,
  wallet: Wallet,
  b: Building,
  now: number,
): UpgradeResult {
  const next = nextLevel(base, b);
  if ("blocked" in next) return next.blocked;
  if (wallet.coins < next.cost) return "coins";
  // Upgrading empties a press or coffee maker into the wallet first, so
  // nothing made at the old level is lost.
  collectOne(base, wallet, b, now);
  wallet.coins -= next.cost;
  b.level += 1;
  return "upgraded";
}

// What a coin press or coffee maker holds right now.
export function stored(b: Building, now: number): number {
  if (b.kind !== "press" && b.kind !== "coffee") return 0;
  const minutes = Math.max(0, now - b.since) / 60_000;
  return Math.floor(
    Math.min(holds(b.level), minutes * makesPerMinute(b.level)),
  );
}

// Empty one press or maker into the wallet, as far as there is room.
// Returns how much moved.
export function collectOne(
  base: Base,
  wallet: Wallet,
  b: Building,
  now: number,
): number {
  const have = stored(b, now);
  if (have <= 0) return 0;
  const room = rooms(base);
  const key = b.kind === "press" ? "coins" : "coffee";
  const space = Math.max(0, room[key] - wallet[key]);
  const take = Math.min(have, space);
  if (take <= 0) return 0;
  wallet[key] += take;
  // Keep what did not fit: move `since` back by the part that stays.
  const left = have - take;
  b.since = now - (left / makesPerMinute(b.level)) * 60_000;
  return take;
}

export function collectAll(base: Base, wallet: Wallet, now: number) {
  let coins = 0;
  let coffee = 0;
  for (const b of base.buildings) {
    const got = collectOne(base, wallet, b, now);
    if (b.kind === "press") coins += got;
    if (b.kind === "coffee") coffee += got;
  }
  return { coins, coffee };
}

// A rough strength for a base's defenses, for the raids that happen while
// the player is away.
export function defensePower(base: Base): number {
  let power = 60 * officeLevel(base);
  for (const b of base.buildings) {
    const def = BUILDINGS[b.kind];
    const scale = 1 + 0.35 * (b.level - 1);
    if (def.role === "defense")
      power += (def.damage / def.every) * def.range * 6 * scale;
    if (def.role === "wall") power += 6 * scale;
  }
  return power;
}
