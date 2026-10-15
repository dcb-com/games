import type { Level } from "~/games/desk-defense/levels";
import { COLS, ROWS } from "~/games/desk-defense/levels";
import type { Boosts } from "~/games/desk-defense/upgrades";
import type { BugKind, HelperKind } from "~/games/desk-defense/units";
import {
  BUGS,
  DRIP_AMOUNT,
  DRIP_EVERY,
  HELPERS,
} from "~/games/desk-defense/units";

// One round of Desk Defense, as plain data, and the rules that move it on.
// Nothing here knows about the screen, so the round can stop between any
// two steps and pick up again later exactly where it was.

export interface Helper {
  id: number;
  kind: HelperKind;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  // Seconds until the next shot, brew or burst.
  timer: number;
}

export interface Bug {
  id: number;
  kind: BugKind;
  row: number;
  // The middle of the bug, in cells from the left edge.
  x: number;
  hp: number;
  maxHp: number;
  slowFor: number;
  hopped: boolean;
  chewing: boolean;
  // Seconds left on the white flash after a hit.
  flash: number;
}

export interface Shot {
  id: number;
  row: number;
  x: number;
  damage: number;
  slows: boolean;
}

// A short-lived mark on the desk: "+25" over a coffee maker, an eraser's
// wipe, a shredder running down its row.
export interface Effect {
  id: number;
  kind: "energy" | "burst" | "shred";
  row: number;
  x: number;
  age: number;
}

export type Outcome = "playing" | "won" | "lost";

// What a click or Enter does on the desk: set down a helper, or take one off.
export type Tool = HelperKind | "remove";

export interface Round {
  level: Level;
  boosts: Boosts;
  time: number;
  energy: number;
  nextDrip: number;
  helpers: Helper[];
  bugs: Bug[];
  shots: Shot[];
  effects: Effect[];
  cooldowns: Record<HelperKind, number>;
  // One shredder waits at the left end of every open row. It saves the row
  // once.
  shredders: boolean[];
  nextSpawn: number;
  kills: number;
  points: number;
  outcome: Outcome;
  cursor: { row: number; col: number };
  selected: Tool | null;
  nextId: number;
}

const SHOT_SPEED = 6;
const SHRED_SPEED = 6;
const EFFECT_LIFE: Record<Effect["kind"], number> = {
  energy: 1,
  burst: 0.5,
  shred: 2,
};

export function newRound(level: Level, boosts: Boosts): Round {
  const middle = level.rows[Math.floor(level.rows.length / 2)] ?? 2;
  return {
    level,
    boosts,
    time: 0,
    energy: level.startEnergy + boosts.startEnergy,
    nextDrip: DRIP_EVERY,
    helpers: [],
    bugs: [],
    shots: [],
    effects: [],
    cooldowns: {
      coffee: 0,
      stapler: 0,
      firewall: 0,
      fan: 0,
      printer: 0,
      eraser: 0,
    },
    shredders: Array.from({ length: ROWS }, (_, row) =>
      level.rows.includes(row),
    ),
    nextSpawn: 0,
    kills: 0,
    points: 0,
    outcome: "playing",
    cursor: { row: middle, col: 1 },
    selected: level.helpers[0] ?? null,
    nextId: 1,
  };
}

export function helperAt(r: Round, row: number, col: number) {
  return r.helpers.find((h) => h.row === row && h.col === col);
}

export type PlaceResult =
  | "placed"
  | "closed-row"
  | "taken"
  | "no-energy"
  | "recharging"
  | "no-card";

export function canPlace(
  r: Round,
  kind: Tool | null,
  row: number,
  col: number,
): PlaceResult {
  if (!kind || kind === "remove" || !r.level.helpers.includes(kind)) {
    return "no-card";
  }
  if (!r.level.rows.includes(row)) return "closed-row";
  if (helperAt(r, row, col)) return "taken";
  if (r.cooldowns[kind] > 0) return "recharging";
  if (r.energy < HELPERS[kind].cost) return "no-energy";
  return "placed";
}

export function place(
  r: Round,
  kind: Tool | null,
  row: number,
  col: number,
): PlaceResult {
  const result = canPlace(r, kind, row, col);
  if (result !== "placed" || !kind || kind === "remove") return result;
  const def = HELPERS[kind];
  const hp = kind === "eraser" ? def.hp : def.hp * r.boosts.toughness;
  r.energy -= def.cost;
  r.cooldowns[kind] = def.recharge * r.boosts.recharge;
  r.helpers.push({
    id: r.nextId++,
    kind,
    row,
    col,
    hp,
    maxHp: hp,
    // A new coffee maker brews its first cup sooner than the rest.
    timer: def.makesEnergy > 0 ? 4 : def.every,
  });
  return "placed";
}

// Take a helper off the desk, to free its cell. Nothing comes back.
export function remove(r: Round, row: number, col: number): boolean {
  const before = r.helpers.length;
  r.helpers = r.helpers.filter((h) => !(h.row === row && h.col === col));
  return r.helpers.length < before;
}

export function moveCursor(r: Round, dRow: number, dCol: number) {
  r.cursor = {
    row: Math.min(ROWS - 1, Math.max(0, r.cursor.row + dRow)),
    col: Math.min(COLS - 1, Math.max(0, r.cursor.col + dCol)),
  };
}

// How far through the level's bugs the round is, from 0 to 1.
export function progress(r: Round): number {
  const total = r.level.spawns.length;
  if (total === 0) return 1;
  return (r.nextSpawn - r.bugs.length) / total;
}

function addEffect(r: Round, kind: Effect["kind"], row: number, x: number) {
  r.effects.push({ id: r.nextId++, kind, row, x, age: 0 });
}

function hurt(bug: Bug, damage: number) {
  bug.hp -= damage;
  bug.flash = 0.12;
}

// Move the round on by dt seconds. Called many times a second while the
// round runs, and never while it is paused.
export function step(r: Round, dt: number) {
  if (r.outcome !== "playing") return;
  r.time += dt;

  for (const kind of r.level.helpers) {
    r.cooldowns[kind] = Math.max(0, r.cooldowns[kind] - dt);
  }

  r.nextDrip -= dt;
  if (r.nextDrip <= 0) {
    r.nextDrip += DRIP_EVERY;
    r.energy += DRIP_AMOUNT;
  }

  while (r.nextSpawn < r.level.spawns.length) {
    const spawn = r.level.spawns[r.nextSpawn];
    if (!spawn || spawn.at > r.time) break;
    const def = BUGS[spawn.kind];
    const hp = def.hp * r.level.hpScale;
    r.bugs.push({
      id: r.nextId++,
      kind: spawn.kind,
      row: spawn.row,
      x: COLS + 0.4,
      hp,
      maxHp: hp,
      slowFor: 0,
      hopped: false,
      chewing: false,
      flash: 0,
    });
    r.nextSpawn += 1;
  }

  stepHelpers(r, dt);
  stepShots(r, dt);
  const lost = stepBugs(r, dt);

  for (const e of r.effects) {
    e.age += dt;
    if (e.kind === "shred") {
      // A running shredder knocks out every bug it passes.
      for (const bug of r.bugs) {
        if (bug.row === e.row && bug.x <= e.x + 0.3) bug.hp = 0;
      }
      e.x += SHRED_SPEED * dt;
    }
  }
  r.effects = r.effects.filter((e) =>
    e.kind === "shred" ? e.x < COLS + 1 : e.age < EFFECT_LIFE[e.kind],
  );

  const alive: Bug[] = [];
  for (const bug of r.bugs) {
    if (bug.hp > 0) {
      alive.push(bug);
      continue;
    }
    r.kills += 1;
    r.points += BUGS[bug.kind].points;
  }
  r.bugs = alive;

  const allOut = r.nextSpawn >= r.level.spawns.length;
  const shredding = r.effects.some((e) => e.kind === "shred");
  if (lost) r.outcome = "lost";
  else if (allOut && r.bugs.length === 0 && !shredding) r.outcome = "won";
}

function stepHelpers(r: Round, dt: number) {
  const gone = new Set<number>();
  for (const h of r.helpers) {
    const def = HELPERS[h.kind];
    if (def.makesEnergy > 0) {
      h.timer -= dt * r.boosts.brewSpeed;
      if (h.timer <= 0) {
        h.timer += def.every;
        r.energy += def.makesEnergy;
        addEffect(r, "energy", h.row, h.col + 0.5);
      }
      continue;
    }
    if (def.burst > 0) {
      h.timer -= dt;
      if (h.timer <= 0) {
        for (const bug of r.bugs) {
          const near =
            Math.abs(bug.row - h.row) <= 1 &&
            Math.abs(bug.x - (h.col + 0.5)) <= 1.6;
          if (near) hurt(bug, def.burst);
        }
        addEffect(r, "burst", h.row, h.col + 0.5);
        gone.add(h.id);
      }
      continue;
    }
    if (def.shots === 0) continue;
    h.timer = Math.max(0, h.timer - dt);
    const target = r.bugs.some(
      (b) => b.row === h.row && b.x >= h.col && b.x <= COLS + 0.2,
    );
    if (!target || h.timer > 0) continue;
    h.timer = def.every;
    for (let i = 0; i < def.shots; i++) {
      r.shots.push({
        id: r.nextId++,
        row: h.row,
        // Two pages leave one after the other, not on top of each other.
        x: h.col + 0.7 - i * 0.35,
        damage: def.damage * r.boosts.damage,
        slows: def.slows,
      });
    }
  }
  if (gone.size > 0) r.helpers = r.helpers.filter((h) => !gone.has(h.id));
}

function stepShots(r: Round, dt: number) {
  const left: Shot[] = [];
  for (const shot of r.shots) {
    shot.x += SHOT_SPEED * dt;
    let hit: Bug | undefined;
    for (const bug of r.bugs) {
      if (bug.row !== shot.row || bug.hp <= 0) continue;
      if (Math.abs(bug.x - shot.x) > 0.3) continue;
      if (!hit || bug.x < hit.x) hit = bug;
    }
    if (hit) {
      hurt(hit, shot.damage);
      if (shot.slows) hit.slowFor = 3;
      continue;
    }
    if (shot.x < COLS + 1) left.push(shot);
  }
  r.shots = left;
}

// Returns true when a bug got past the left edge with no shredder to stop it.
function stepBugs(r: Round, dt: number): boolean {
  let lost = false;
  for (const bug of r.bugs) {
    if (bug.hp <= 0) continue;
    const def = BUGS[bug.kind];
    bug.flash = Math.max(0, bug.flash - dt);
    bug.slowFor = Math.max(0, bug.slowFor - dt);
    // The bug's front edge is a little left of its middle.
    const frontCol = Math.floor(bug.x - 0.3);
    const blocker = r.helpers.find(
      (h) => h.row === bug.row && h.col === frontCol && h.kind !== "eraser",
    );
    if (blocker && def.hops && !bug.hopped) {
      bug.hopped = true;
      bug.x = blocker.col - 0.35;
      bug.chewing = false;
      continue;
    }
    if (blocker) {
      bug.chewing = true;
      blocker.hp -= def.bite * dt;
      continue;
    }
    bug.chewing = false;
    const pace = bug.slowFor > 0 ? 0.5 : 1;
    bug.x -= def.speed * pace * dt;

    if (bug.x < -0.2) {
      const running = r.effects.some(
        (e) => e.kind === "shred" && e.row === bug.row,
      );
      // A shredder already running down this row takes this bug too.
      if (running) continue;
      if (r.shredders[bug.row]) {
        r.shredders[bug.row] = false;
        addEffect(r, "shred", bug.row, -0.5);
      } else {
        lost = true;
      }
    }
  }
  r.helpers = r.helpers.filter((h) => h.hp > 0);
  return lost;
}

// The score for a finished round. Knocked-out bugs count either way; a
// cleared level adds a bonus, more for every shredder still waiting.
export function finalScore(r: Round): number {
  if (r.outcome !== "won") return r.points;
  const shreddersLeft = r.level.rows.filter((row) => r.shredders[row]).length;
  return r.points + 100 + 10 * r.level.number + 50 * shreddersLeft;
}
