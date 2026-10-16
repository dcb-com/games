import type { Base } from "~/games/cubicle-clash/base";
import type { BuildingKind, TroopKind } from "~/games/cubicle-clash/units";
import {
  BUILDINGS,
  COLS,
  RAID_SECONDS,
  ROWS,
  TROOPS,
  TROOP_ORDER,
  levelScale,
} from "~/games/cubicle-clash/units";

// One raid on a coworker's base, as plain data, and the rules that move it
// on. Like Desk Defense's round, it can stop between any two steps and
// carry on later exactly where it was.

export interface Target {
  id: number;
  kind: BuildingKind;
  level: number;
  col: number;
  row: number;
  size: number;
  hp: number;
  maxHp: number;
  // Seconds until a defense can fire again.
  timer: number;
  // Seconds since it last fired or was hit, for the drawing.
  acted: number;
  bitten: number;
  down: boolean;
}

export interface Troop {
  id: number;
  kind: TroopKind;
  // The middle of the troop, in tiles.
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  target: number | null;
  // A building in the way that it is breaking through to reach the target.
  blocker: number | null;
  slowFor: number;
  flash: number;
  age: number;
  facing: 1 | -1;
  chewing: boolean;
  // A jump over a wall, for the drawing.
  hop: { t: number } | null;
}

export type ShotKind = "staple" | "puff" | "plane" | "zap";

export interface Shot {
  id: number;
  kind: ShotKind;
  x: number;
  y: number;
  // It flies to this troop; if the troop is gone, to where it last was.
  troop: number;
  tx: number;
  ty: number;
  damage: number;
  splash: number;
  slows: boolean;
}

export type RaidEvent =
  | { type: "drop"; x: number; y: number }
  | { type: "poof"; x: number; y: number; kind: TroopKind }
  | { type: "rubble"; x: number; y: number; kind: BuildingKind }
  | { type: "hit"; x: number; y: number; shot: ShotKind }
  | { type: "fire"; x: number; y: number; shot: ShotKind }
  | { type: "star"; stars: number };

export type RaidOutcome = "playing" | "done";

export interface Raid {
  rival: { name: string; email: string };
  targets: Target[];
  troops: Troop[];
  shots: Shot[];
  events: RaidEvent[];
  // Troops still waiting to be dropped.
  army: Record<TroopKind, number>;
  time: number;
  outcome: RaidOutcome;
  stars: number;
  cursor: { col: number; row: number };
  selected: TroopKind | null;
  loot: { coins: number; coffee: number };
  // The raider's break room level. Troops are stronger at higher levels.
  level: number;
  nextId: number;
}

const SHOT_SPEED = 7;
const REACH = 0.55;

export function newRaid(
  rival: { name: string; email: string },
  base: Base,
  army: Record<TroopKind, number>,
  loot: { coins: number; coffee: number },
  level = 1,
): Raid {
  let nextId = 1;
  const targets: Target[] = base.buildings.map((b) => {
    const def = BUILDINGS[b.kind];
    const hp = def.hp * levelScale(b.level);
    return {
      id: nextId++,
      kind: b.kind,
      level: b.level,
      col: b.col,
      row: b.row,
      size: def.size,
      hp,
      maxHp: hp,
      timer: def.every,
      acted: 99,
      bitten: 99,
      down: false,
    };
  });
  const first = TROOP_ORDER.find((k) => army[k] > 0);
  return {
    rival,
    targets,
    troops: [],
    shots: [],
    events: [],
    army: { ...army },
    time: 0,
    outcome: "playing",
    stars: 0,
    cursor: { col: 0, row: 3 },
    selected: first ?? null,
    loot,
    level: Math.max(1, level),
    nextId,
  };
}

function emit(r: Raid, e: RaidEvent) {
  r.events.push(e);
  if (r.events.length > 200) r.events.splice(0, r.events.length - 200);
}

function standing(r: Raid) {
  return r.targets.filter((t) => !t.down);
}

function scored(r: Raid) {
  return r.targets.filter((t) => t.kind !== "wall");
}

// How much of the base is down, from 0 to 1. Walls do not count.
export function destruction(r: Raid): number {
  const all = scored(r);
  if (all.length === 0) return 1;
  return all.filter((t) => t.down).length / all.length;
}

export function starsOf(r: Raid): number {
  const share = destruction(r);
  const office = r.targets.find((t) => t.kind === "office");
  return (share >= 0.5 ? 1 : 0) + (office?.down ? 1 : 0) + (share >= 1 ? 1 : 0);
}

// Troops may land anywhere on the outer edge, where nothing is ever built,
// and on any other open tile that is not next to a building.
export function canDrop(r: Raid, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  if (col === 0 || row === 0 || col === COLS - 1 || row === ROWS - 1)
    return true;
  return !r.targets.some(
    (t) =>
      col >= t.col - 1 &&
      col <= t.col + t.size &&
      row >= t.row - 1 &&
      row <= t.row + t.size,
  );
}

export type DropResult = "dropped" | "none-left" | "too-close" | "over";

export function drop(
  r: Raid,
  kind: TroopKind | null,
  col: number,
  row: number,
): DropResult {
  if (r.outcome !== "playing") return "over";
  if (!kind || r.army[kind] <= 0) return "none-left";
  if (!canDrop(r, col, row)) return "too-close";
  r.army[kind] -= 1;
  const def = TROOPS[kind];
  const hp = def.hp * levelScale(r.level);
  // A little scatter, so a handful dropped on one tile do not stack.
  const jitter = () => ((r.nextId * 37) % 10) / 25 - 0.2;
  r.troops.push({
    id: r.nextId++,
    kind,
    x: col + 0.5 + jitter(),
    y: row + 0.5 + jitter(),
    hp,
    maxHp: hp,
    target: null,
    blocker: null,
    slowFor: 0,
    flash: 0,
    age: 0,
    facing: col < COLS / 2 ? 1 : -1,
    chewing: false,
    hop: null,
  });
  emit(r, { type: "drop", x: col + 0.5, y: row + 0.5 });
  return "dropped";
}

export function moveCursor(r: Raid, dCol: number, dRow: number) {
  r.cursor = {
    col: Math.min(COLS - 1, Math.max(0, r.cursor.col + dCol)),
    row: Math.min(ROWS - 1, Math.max(0, r.cursor.row + dRow)),
  };
}

// The nearest point of a building to (x, y), and how far it is.
function reach(t: Target, x: number, y: number) {
  const nx = Math.max(t.col, Math.min(t.col + t.size, x));
  const ny = Math.max(t.row, Math.min(t.row + t.size, y));
  return { x: nx, y: ny, d: Math.hypot(nx - x, ny - y) };
}

function pickTarget(r: Raid, troop: Troop): Target | undefined {
  const want = TROOPS[troop.kind].goesFor;
  const left = standing(r).filter((t) => t.kind !== "wall");
  const preferred =
    want === "any" ? left : left.filter((t) => BUILDINGS[t.kind].role === want);
  const pool = preferred.length > 0 ? preferred : left;
  let best: Target | undefined;
  let bestD = Infinity;
  for (const t of pool) {
    const d = reach(t, troop.x, troop.y).d;
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

function targetAt(r: Raid, x: number, y: number) {
  const col = Math.floor(x);
  const row = Math.floor(y);
  return standing(r).find(
    (t) =>
      col >= t.col &&
      col < t.col + t.size &&
      row >= t.row &&
      row < t.row + t.size,
  );
}

function hurtTarget(r: Raid, t: Target, damage: number) {
  if (t.down) return;
  t.hp -= damage;
  t.bitten = 0;
  if (t.hp <= 0) {
    t.down = true;
    emit(r, {
      type: "rubble",
      x: t.col + t.size / 2,
      y: t.row + t.size / 2,
      kind: t.kind,
    });
    const stars = starsOf(r);
    if (stars > r.stars) {
      r.stars = stars;
      emit(r, { type: "star", stars });
    }
  }
}

function hurtTroop(r: Raid, troop: Troop, damage: number, slows: boolean) {
  if (troop.hp <= 0) return;
  troop.hp -= damage;
  troop.flash = 0.12;
  if (slows) troop.slowFor = 2;
  if (troop.hp <= 0)
    emit(r, { type: "poof", x: troop.x, y: troop.y, kind: troop.kind });
}

const SHOT_FOR: Record<string, ShotKind> = {
  stapler: "staple",
  fan: "puff",
  printer: "plane",
  lamp: "zap",
};

export function step(r: Raid, dt: number) {
  if (r.outcome !== "playing") return;
  r.time += dt;

  // Defenses.
  for (const t of r.targets) {
    t.acted += dt;
    t.bitten += dt;
    const def = BUILDINGS[t.kind];
    if (t.down || def.role !== "defense") continue;
    t.timer = Math.max(0, t.timer - dt);
    if (t.timer > 0) continue;
    const cx = t.col + 0.5;
    const cy = t.row + 0.5;
    let aim: Troop | undefined;
    let aimD = Infinity;
    for (const troop of r.troops) {
      if (troop.hp <= 0) continue;
      const d = Math.hypot(troop.x - cx, troop.y - cy);
      if (d <= def.range && d < aimD) {
        aim = troop;
        aimD = d;
      }
    }
    if (!aim) continue;
    t.timer = def.every;
    t.acted = 0;
    const kind = SHOT_FOR[t.kind] ?? "staple";
    const damage = def.damage * levelScale(t.level);
    emit(r, { type: "fire", x: cx, y: cy, shot: kind });
    if (kind === "zap") {
      // The lamp's beam lands at once.
      hurtTroop(r, aim, damage, false);
      emit(r, { type: "hit", x: aim.x, y: aim.y, shot: kind });
      continue;
    }
    r.shots.push({
      id: r.nextId++,
      kind,
      x: cx,
      y: cy - 0.3,
      troop: aim.id,
      tx: aim.x,
      ty: aim.y,
      damage,
      splash: def.splash,
      slows: def.slows,
    });
  }

  // Shots in the air.
  const flying = [];
  for (const s of r.shots) {
    const aim = r.troops.find((t) => t.id === s.troop && t.hp > 0);
    if (aim) {
      s.tx = aim.x;
      s.ty = aim.y;
    }
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const d = Math.hypot(dx, dy);
    const go = SHOT_SPEED * dt;
    if (d > go) {
      s.x += (dx / d) * go;
      s.y += (dy / d) * go;
      flying.push(s);
      continue;
    }
    emit(r, { type: "hit", x: s.tx, y: s.ty, shot: s.kind });
    if (s.splash > 0) {
      for (const troop of r.troops) {
        if (Math.hypot(troop.x - s.tx, troop.y - s.ty) <= s.splash) {
          hurtTroop(r, troop, s.damage, s.slows);
        }
      }
    } else if (aim) {
      hurtTroop(r, aim, s.damage, s.slows);
    }
  }
  r.shots = flying;

  // Troops.
  for (const troop of r.troops) {
    if (troop.hp <= 0) continue;
    const def = TROOPS[troop.kind];
    troop.age += dt;
    troop.flash = Math.max(0, troop.flash - dt);
    troop.slowFor = Math.max(0, troop.slowFor - dt);
    if (troop.hop) {
      troop.hop.t += dt / 0.45;
      if (troop.hop.t >= 1) troop.hop = null;
    }

    let target = r.targets.find((t) => t.id === troop.target && !t.down);
    if (!target) {
      target = pickTarget(r, troop);
      troop.target = target?.id ?? null;
      troop.blocker = null;
    }
    if (!target) {
      troop.chewing = false;
      continue;
    }
    const blocker = r.targets.find((t) => t.id === troop.blocker && !t.down);
    const goal = blocker ?? target;
    const near = reach(goal, troop.x, troop.y);
    if (near.d <= REACH) {
      troop.chewing = true;
      troop.facing = near.x > troop.x ? 1 : -1;
      hurtTarget(r, goal, def.dps * levelScale(r.level) * dt);
      if (goal.down) troop.blocker = null;
      continue;
    }
    troop.chewing = false;
    troop.blocker = null;
    const aimAt = reach(target, troop.x, troop.y);
    const dx = aimAt.x - troop.x;
    const dy = aimAt.y - troop.y;
    const d = Math.hypot(dx, dy);
    const go = def.speed * (troop.slowFor > 0 ? 0.5 : 1) * dt;
    const nx = troop.x + (dx / d) * go;
    const ny = troop.y + (dy / d) * go;
    troop.facing = dx > 0 ? 1 : -1;

    // Something standing in the way? Walls stop all but hoppers; any other
    // building in the way gets broken through.
    const ahead = targetAt(r, nx + (dx / d) * 0.3, ny + (dy / d) * 0.3);
    if (ahead && ahead.id !== target.id) {
      if (ahead.kind === "wall" && def.jumps) {
        troop.hop ??= { t: 0 };
      } else {
        troop.blocker = ahead.id;
        continue;
      }
    }
    troop.x = nx;
    troop.y = ny;
  }

  const alive = r.troops.filter((t) => t.hp > 0);
  r.troops = alive;

  const waiting = Object.values(r.army).reduce((sum, n) => sum + n, 0);
  const allDown = scored(r).every((t) => t.down);
  const spent = waiting === 0 && alive.length === 0;
  if (allDown || spent || r.time >= RAID_SECONDS) r.outcome = "done";
}

// End the raid now, keeping what was won so far.
export function surrender(r: Raid) {
  r.outcome = "done";
}

export function lootTaken(r: Raid) {
  const share = destruction(r);
  return {
    coins: Math.floor(r.loot.coins * share),
    coffee: Math.floor(r.loot.coffee * share),
  };
}

// Trophies won or lost, the way the game this is modeled on does it:
// more for beating someone above you, fewer for someone below.
export function trophyChange(
  stars: number,
  mine: number,
  theirs: number,
): number {
  const gap = Math.max(-12, Math.min(12, Math.round((theirs - mine) / 40)));
  if (stars === 0) return -Math.max(4, 10 - Math.round(gap / 2));
  return Math.max(4, Math.round((14 + gap) * (stars / 3) + 6));
}
