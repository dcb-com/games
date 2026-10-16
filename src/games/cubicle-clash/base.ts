import { seeded } from "~/games/art/color";
import type { BuildingKind, ClutterKind } from "~/games/cubicle-clash/units";
import {
  BUILDINGS,
  CLEAR_SECONDS,
  CLUTTER,
  COLS,
  MAX_LEVEL,
  ROWS,
  armyRoom,
  buildSeconds,
  buildersFor,
  coffeeRoom,
  coinRoom,
  costFor,
  gemsToFinish,
  holds,
  isDecor,
  makesPerMinute,
} from "~/games/cubicle-clash/units";

// A player's fort: what stands where, at what level, the clutter still
// lying about, and the rules for building, upgrading, clearing and
// collecting. Building takes time and a free builder, as in the game this is
// modeled on. Plain data, so it saves as is.

// Work a builder is doing: when it finishes, and how long it takes in all.
export interface Job {
  kind: "build" | "upgrade";
  until: number;
  total: number;
}

export interface Building {
  id: number;
  kind: BuildingKind;
  level: number;
  // The top-left tile.
  col: number;
  row: number;
  // For a coin press or coffee maker: when it was last emptied, in ms.
  since: number;
  job: Job | null;
}

export interface Clutter {
  id: number;
  kind: ClutterKind;
  col: number;
  row: number;
  // A builder clearing it away.
  clearing: { until: number; total: number } | null;
}

export interface Base {
  buildings: Building[];
  clutter: Clutter[];
  nextId: number;
}

export interface Wallet {
  coins: number;
  coffee: number;
  gems: number;
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

export function clutterAt(base: Base, col: number, row: number) {
  return base.clutter.find((c) => c.col === col && c.row === row);
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
  // A building still going up does not count yet.
  return base.buildings
    .filter((b) => b.kind === kind && b.job?.kind !== "build")
    .map((b) => b.level);
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

export function builders(base: Base) {
  const busy =
    base.buildings.filter((b) => b.job).length +
    base.clutter.filter((c) => c.clearing).length;
  const all = buildersFor(officeLevel(base));
  return { busy, all, free: Math.max(0, all - busy) };
}

const CLUTTER_KINDS: ClutterKind[] = ["boxes", "papers", "bush", "rock"];

// Scatter some clutter on open land, from a seed.
function scatter(base: Base, count: number, seed: number) {
  const random = seeded(seed);
  for (let i = 0; i < count * 6 && count > 0; i++) {
    const col = 1 + Math.floor(random() * (COLS - 2));
    const row = 1 + Math.floor(random() * (ROWS - 2));
    if (buildingAt(base, col, row) || clutterAt(base, col, row)) continue;
    const kind =
      CLUTTER_KINDS[Math.floor(random() * CLUTTER_KINDS.length)] ?? "boxes";
    base.clutter.push({ id: base.nextId++, kind, col, row, clearing: null });
    count -= 1;
  }
}

export function starterBase(now: number): Base {
  const list: Omit<Building, "id">[] = [
    { kind: "office", level: 1, col: 7, row: 3, since: now, job: null },
    { kind: "press", level: 1, col: 4, row: 2, since: now, job: null },
    { kind: "coffee", level: 1, col: 4, row: 5, since: now, job: null },
    { kind: "breakroom", level: 1, col: 11, row: 2, since: now, job: null },
    { kind: "stapler", level: 1, col: 10, row: 5, since: now, job: null },
    { kind: "plant", level: 1, col: 6, row: 3, since: now, job: null },
  ];
  const base: Base = {
    buildings: list.map((b, i) => ({ ...b, id: i + 1 })),
    clutter: [],
    nextId: list.length + 1,
  };
  scatter(base, 9, 42);
  return base;
}

// New clutter piles up while the player is away: one piece every two
// hours, up to twelve pieces in all.
export function pileUp(base: Base, from: number, to: number) {
  const pieces = Math.floor(to / 7_200_000) - Math.floor(from / 7_200_000);
  const room = 12 - base.clutter.length;
  scatter(
    base,
    Math.max(0, Math.min(pieces, room, 3)),
    Math.floor(to / 7_200_000),
  );
}

export type BuildResult =
  | "built"
  | "full"
  | "taken"
  | "edge"
  | "coins"
  | "busy";

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
      if (clutterAt(base, c, r)) return "taken";
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
  if (buildSeconds(kind, 1) > 0 && builders(base).free === 0) return "busy";
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
  const seconds = buildSeconds(kind, 1);
  base.buildings.push({
    id: base.nextId++,
    kind,
    level: 1,
    col,
    row,
    since: now,
    job:
      seconds > 0
        ? { kind: "build", until: now + seconds * 1000, total: seconds * 1000 }
        : null,
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

// Decorations can be put away again, for their full price.
export function sell(base: Base, wallet: Wallet, b: Building): boolean {
  if (!isDecor(b.kind)) return false;
  base.buildings = base.buildings.filter((x) => x.id !== b.id);
  wallet.coins += costFor(b.kind, 1);
  return true;
}

export type UpgradeResult =
  | "upgraded"
  | "max"
  | "office"
  | "coins"
  | "busy"
  | "working";

// The cost and time of the next level, or why there is none.
export function nextLevel(
  base: Base,
  b: Building,
): { cost: number; seconds: number } | { blocked: "max" | "office" } {
  if (b.level >= MAX_LEVEL || isDecor(b.kind)) return { blocked: "max" };
  if (b.kind !== "office" && b.level >= officeLevel(base))
    return { blocked: "office" };
  return {
    cost: costFor(b.kind, b.level + 1),
    seconds: buildSeconds(b.kind, b.level + 1),
  };
}

export function upgrade(
  base: Base,
  wallet: Wallet,
  b: Building,
  now: number,
): UpgradeResult {
  if (b.job) return "working";
  const next = nextLevel(base, b);
  if ("blocked" in next) return next.blocked;
  if (wallet.coins < next.cost) return "coins";
  if (next.seconds > 0 && builders(base).free === 0) return "busy";
  // Upgrading empties a press or coffee maker into the wallet first, so
  // nothing made at the old level is lost.
  collectOne(base, wallet, b, now);
  wallet.coins -= next.cost;
  if (next.seconds === 0) {
    b.level += 1;
  } else {
    b.job = {
      kind: "upgrade",
      until: now + next.seconds * 1000,
      total: next.seconds * 1000,
    };
  }
  return "upgraded";
}

export type ClearResult = "clearing" | "coins" | "busy" | "working";

export function clear(
  base: Base,
  wallet: Wallet,
  c: Clutter,
  now: number,
): ClearResult {
  if (c.clearing) return "working";
  const cost = CLUTTER[c.kind].cost;
  if (wallet.coins < cost) return "coins";
  if (builders(base).free === 0) return "busy";
  wallet.coins -= cost;
  c.clearing = {
    until: now + CLEAR_SECONDS * 1000,
    total: CLEAR_SECONDS * 1000,
  };
  return "clearing";
}

export interface Finished {
  kind: "built" | "upgraded" | "cleared";
  what: BuildingKind | ClutterKind;
  col: number;
  row: number;
  size: number;
  level: number;
  gems: number;
}

// Finish every job whose time is up. Returns what finished, for the
// celebrations.
export function settle(base: Base, wallet: Wallet, now: number): Finished[] {
  const done: Finished[] = [];
  for (const b of base.buildings) {
    if (!b.job || b.job.until > now) continue;
    const kind = b.job.kind;
    if (kind === "upgrade") b.level += 1;
    // A coin press or coffee maker starts filling once it is up.
    b.since = Math.max(b.since, b.job.until);
    b.job = null;
    done.push({
      kind: kind === "build" ? "built" : "upgraded",
      what: b.kind,
      col: b.col,
      row: b.row,
      size: BUILDINGS[b.kind].size,
      level: b.level,
      gems: 0,
    });
  }
  const left: Clutter[] = [];
  for (const c of base.clutter) {
    if (!c.clearing || c.clearing.until > now) {
      left.push(c);
      continue;
    }
    const gems = CLUTTER[c.kind].gems;
    wallet.gems += gems;
    done.push({
      kind: "cleared",
      what: c.kind,
      col: c.col,
      row: c.row,
      size: 1,
      level: 0,
      gems,
    });
  }
  base.clutter = left;
  return done;
}

// Gems to finish a building's job now, or 0 when there is none.
export function finishCost(b: Building, now: number): number {
  return b.job ? gemsToFinish(Math.max(0, b.job.until - now) / 1000) : 0;
}

export function finishNow(
  base: Base,
  wallet: Wallet,
  b: Building,
  now: number,
): Finished[] | null {
  const cost = finishCost(b, now);
  if (!b.job || wallet.gems < cost) return null;
  wallet.gems -= cost;
  b.job.until = now;
  return settle(base, wallet, now);
}

// What a coin press or coffee maker holds right now.
export function stored(b: Building, now: number): number {
  if (b.kind !== "press" && b.kind !== "coffee") return 0;
  if (b.job?.kind === "build") return 0;
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
    if (b.job?.kind === "build") continue;
    const def = BUILDINGS[b.kind];
    const scale = 1 + 0.35 * (b.level - 1);
    if (def.role === "defense")
      power += (def.damage / def.every) * def.range * 6 * scale;
    if (def.role === "wall") power += 6 * scale;
  }
  return power;
}

// How grand a fort is: every coin spent on it, and a little extra for
// decorations. Shown on the base screen.
export function fortRating(base: Base): number {
  let total = 0;
  for (const b of base.buildings) {
    if (b.job?.kind === "build") continue;
    for (let level = 1; level <= b.level; level++)
      total += costFor(b.kind, level);
    if (isDecor(b.kind)) total += costFor(b.kind, 1);
  }
  return Math.round(total / 10);
}
