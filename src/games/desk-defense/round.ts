import type { Level } from "~/games/desk-defense/levels";
import { COLS, ROWS } from "~/games/desk-defense/levels";
import type { Boosts } from "~/games/desk-defense/upgrades";
import type { CritterKind, HelperKind } from "~/games/desk-defense/units";
import {
  ANGRY_SPEED,
  CRITTERS,
  DRIP_AMOUNT,
  DRIP_EVERY,
  GUST_EVERY,
  GUST_PUSH,
  HELPERS,
  PLANE_PIERCE,
  POWER_EVERY,
  POWER_TIMES,
  STICKY_HOLD,
  STICKY_USES,
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
  // Seconds until the next shot, brew, zap or wipe.
  timer: number;
  // Shots fired so far. Every fourth staple is a gold one.
  shots: number;
  // Seconds until a fan's next gust.
  gust: number;
  // How many more critters a sticky note can hold.
  uses: number;
  // Seconds since it last did something, and since it was last bitten.
  // The drawing uses these to recoil, glow and shake.
  acted: number;
  bitten: number;
}

export interface Critter {
  id: number;
  kind: CritterKind;
  row: number;
  // The middle of the critter, in cells from the left edge.
  x: number;
  hp: number;
  maxHp: number;
  // A helmet takes hits first.
  armor: number;
  maxArmor: number;
  slowFor: number;
  stuckFor: number;
  // The sticky note it last got stuck on, so one note holds it only once.
  stuckOn: number;
  hopped: boolean;
  // A hop in the air: where it started, where it lands, and how far along.
  hop: { from: number; to: number; t: number } | null;
  chewing: boolean;
  // Seconds left on the white flash after a hit, and on a firewall's burn.
  flash: number;
  burn: number;
  // Shellby without its helmet, or Grumble after its roar.
  angry: boolean;
  age: number;
}

export type ShotKind = "staple" | "power" | "puff" | "plane";

export interface Shot {
  id: number;
  kind: ShotKind;
  row: number;
  x: number;
  damage: number;
  // How many more critters a plane can pass through.
  pierce: number;
  hit: number[];
}

// A shredder running down its row. It knocks out every critter it passes.
export interface Shred {
  row: number;
  x: number;
}

// Things that just happened, for the drawing to turn into puffs, sparks
// and flying energy. The rules never read them back.
export type GameEvent =
  | { type: "poof"; row: number; x: number; kind: CritterKind }
  | { type: "hit"; row: number; x: number; shot: ShotKind | "zap" }
  | { type: "brew"; row: number; col: number }
  | { type: "fire"; row: number; col: number; shot: ShotKind }
  | { type: "gust"; row: number; col: number }
  | { type: "zap"; row: number; col: number }
  | { type: "wipe"; row: number; col: number }
  | { type: "stick"; row: number; col: number }
  | { type: "helmet"; row: number; x: number }
  | { type: "roar"; row: number; x: number }
  | { type: "split"; row: number; x: number }
  | { type: "broken"; row: number; col: number; kind: HelperKind }
  | { type: "placed"; row: number; col: number }
  | { type: "shred"; row: number };

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
  critters: Critter[];
  shots: Shot[];
  shreds: Shred[];
  events: GameEvent[];
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

const SHOT_SPEED: Record<ShotKind, number> = {
  staple: 6,
  power: 6,
  puff: 5,
  plane: 4.5,
};
const SHRED_SPEED = 6;
const HOP_TIME = 0.6;
// Events wait here for the drawing. While nothing draws, keep only the last
// few, so a round left alone does not fill up.
const MAX_EVENTS = 200;

export function newRound(level: Level, boosts: Boosts): Round {
  const middle = level.rows[Math.floor(level.rows.length / 2)] ?? 2;
  return {
    level,
    boosts,
    time: 0,
    energy: level.startEnergy + boosts.startEnergy,
    nextDrip: DRIP_EVERY,
    helpers: [],
    critters: [],
    shots: [],
    shreds: [],
    events: [],
    cooldowns: {
      coffee: 0,
      stapler: 0,
      firewall: 0,
      fan: 0,
      sticky: 0,
      printer: 0,
      eraser: 0,
      lamp: 0,
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

function emit(r: Round, e: GameEvent) {
  r.events.push(e);
  if (r.events.length > MAX_EVENTS)
    r.events.splice(0, r.events.length - MAX_EVENTS);
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
  const sturdy = def.hp < 9999;
  const hp = sturdy ? def.hp * r.boosts.toughness : def.hp;
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
    timer: kind === "coffee" ? 4 : def.every,
    shots: 0,
    gust: GUST_EVERY,
    uses: STICKY_USES,
    acted: 99,
    bitten: 99,
  });
  emit(r, { type: "placed", row, col });
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

// How far through the level's critters the round is, from 0 to 1.
export function progress(r: Round): number {
  const total = r.level.spawns.length;
  if (total === 0) return 1;
  const waiting = r.critters.filter((c) => c.kind !== "mini").length;
  return Math.max(0, (r.nextSpawn - waiting) / total);
}

function newCritter(r: Round, kind: CritterKind, row: number, x: number) {
  const def = CRITTERS[kind];
  const hp = def.hp * r.level.hpScale;
  const critter: Critter = {
    id: r.nextId++,
    kind,
    row,
    x,
    hp,
    maxHp: hp,
    armor: def.armor * r.level.hpScale,
    maxArmor: def.armor * r.level.hpScale,
    slowFor: 0,
    stuckFor: 0,
    stuckOn: 0,
    hopped: false,
    hop: null,
    chewing: false,
    flash: 0,
    burn: 0,
    angry: false,
    age: 0,
  };
  r.critters.push(critter);
  return critter;
}

function hurt(r: Round, c: Critter, damage: number) {
  if (c.hp <= 0) return;
  c.flash = 0.12;
  let left = damage;
  if (c.armor > 0) {
    const taken = Math.min(c.armor, left);
    c.armor -= taken;
    left -= taken;
    if (c.armor <= 0) {
      c.angry = true;
      emit(r, { type: "helmet", row: c.row, x: c.x });
    }
  }
  c.hp -= left;
  // Grumble roars once, at half health, and two fuzzballs come to help.
  if (c.kind === "grumble" && !c.angry && c.hp > 0 && c.hp <= c.maxHp / 2) {
    c.angry = true;
    emit(r, { type: "roar", row: c.row, x: c.x });
    const open = r.level.rows;
    const near = [c.row - 1, c.row + 1].map((row) =>
      open.includes(row) ? row : c.row,
    );
    for (const row of near) {
      newCritter(r, "fuzzball", row, Math.min(COLS + 0.3, c.x + 0.6));
    }
  }
}

function inFront(c: Critter, h: Helper) {
  return c.row === h.row && c.x >= h.col && c.x <= COLS + 0.2 && c.hp > 0;
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
    newCritter(r, spawn.kind, spawn.row, COLS + 0.4);
    r.nextSpawn += 1;
  }

  stepHelpers(r, dt);
  stepShots(r, dt);
  const lost = stepCritters(r, dt);

  for (const s of r.shreds) {
    s.x += SHRED_SPEED * dt;
    for (const c of r.critters) {
      if (c.row === s.row && c.x <= s.x + 0.3) c.hp = 0;
    }
  }
  r.shreds = r.shreds.filter((s) => s.x < COLS + 1);

  // Minis from a splitter are added to the round as they are made, so this
  // walks a copy of the list as it was.
  const before = r.critters;
  r.critters = [];
  for (const c of before) {
    if (c.hp > 0) {
      r.critters.push(c);
      continue;
    }
    r.kills += 1;
    r.points += CRITTERS[c.kind].points;
    emit(r, { type: "poof", row: c.row, x: c.x, kind: c.kind });
    if (c.kind === "splitter") {
      emit(r, { type: "split", row: c.row, x: c.x });
      newCritter(r, "mini", c.row, c.x - 0.15);
      newCritter(r, "mini", c.row, c.x + 0.25);
    }
  }

  const allOut = r.nextSpawn >= r.level.spawns.length;
  if (lost) r.outcome = "lost";
  else if (allOut && r.critters.length === 0 && r.shreds.length === 0) {
    r.outcome = "won";
  }
}

function fire(r: Round, h: Helper, kind: ShotKind, damage: number, x: number) {
  r.shots.push({
    id: r.nextId++,
    kind,
    row: h.row,
    x,
    damage,
    pierce: kind === "plane" ? PLANE_PIERCE : 1,
    hit: [],
  });
}

function stepHelpers(r: Round, dt: number) {
  const gone = new Set<number>();
  for (const h of r.helpers) {
    const def = HELPERS[h.kind];
    h.acted += dt;
    h.bitten += dt;
    const target = r.critters.some((c) => inFront(c, h));

    switch (h.kind) {
      case "coffee":
        h.timer -= dt * r.boosts.brewSpeed;
        if (h.timer <= 0) {
          h.timer += def.every;
          h.acted = 0;
          r.energy += 25;
          emit(r, { type: "brew", row: h.row, col: h.col });
        }
        break;
      case "eraser":
        h.timer -= dt;
        if (h.timer <= 0) {
          for (const c of r.critters) {
            const near =
              Math.abs(c.row - h.row) <= 1 &&
              Math.abs(c.x - (h.col + 0.5)) <= 1.6;
            if (near) hurt(r, c, def.damage);
          }
          emit(r, { type: "wipe", row: h.row, col: h.col });
          gone.add(h.id);
        }
        break;
      case "lamp":
        h.timer = Math.max(0, h.timer - dt);
        if (target && h.timer <= 0) {
          h.timer = def.every;
          h.acted = 0;
          emit(r, { type: "zap", row: h.row, col: h.col });
          for (const c of r.critters) {
            if (!inFront(c, h)) continue;
            hurt(r, c, def.damage * r.boosts.damage);
            emit(r, { type: "hit", row: c.row, x: c.x, shot: "zap" });
          }
        }
        break;
      case "fan":
        h.gust = Math.max(0, h.gust - dt);
        if (target && h.gust <= 0) {
          h.gust = GUST_EVERY;
          emit(r, { type: "gust", row: h.row, col: h.col });
          for (const c of r.critters) {
            if (!inFront(c, h) || c.hop) continue;
            const push = c.kind === "grumble" ? GUST_PUSH * 0.3 : GUST_PUSH;
            c.x = Math.min(COLS + 0.4, c.x + push);
            c.chewing = false;
          }
        }
        shoot(r, h, dt, target, "puff");
        break;
      case "stapler":
        shoot(r, h, dt, target, "staple");
        break;
      case "printer":
        shoot(r, h, dt, target, "plane");
        break;
      case "firewall":
      case "sticky":
        break;
    }
  }
  if (gone.size > 0) r.helpers = r.helpers.filter((h) => !gone.has(h.id));
}

function shoot(
  r: Round,
  h: Helper,
  dt: number,
  target: boolean,
  kind: ShotKind,
) {
  const def = HELPERS[h.kind];
  h.timer = Math.max(0, h.timer - dt);
  if (!target || h.timer > 0) return;
  h.timer = def.every;
  h.acted = 0;
  h.shots += 1;
  const damage = def.damage * r.boosts.damage;
  const power = kind === "staple" && h.shots % POWER_EVERY === 0;
  const shot = power ? "power" : kind;
  fire(r, h, shot, power ? damage * POWER_TIMES : damage, h.col + 0.75);
  emit(r, { type: "fire", row: h.row, col: h.col, shot });
}

function stepShots(r: Round, dt: number) {
  const left: Shot[] = [];
  for (const shot of r.shots) {
    shot.x += SHOT_SPEED[shot.kind] * dt;
    let hit: Critter | undefined;
    for (const c of r.critters) {
      if (c.row !== shot.row || c.hp <= 0 || c.hop) continue;
      if (shot.hit.includes(c.id)) continue;
      if (Math.abs(c.x - shot.x) > 0.3) continue;
      if (!hit || c.x < hit.x) hit = c;
    }
    if (hit) {
      hurt(r, hit, shot.damage);
      if (shot.kind === "puff") hit.slowFor = 3;
      emit(r, { type: "hit", row: hit.row, x: hit.x, shot: shot.kind });
      shot.hit.push(hit.id);
      shot.pierce -= 1;
      if (shot.pierce <= 0) continue;
    }
    if (shot.x < COLS + 1) left.push(shot);
  }
  r.shots = left;
}

// Returns true when a critter got past the left edge with no shredder to
// stop it.
function stepCritters(r: Round, dt: number): boolean {
  let lost = false;
  const usedUp = new Set<number>();
  for (const c of r.critters) {
    if (c.hp <= 0) continue;
    const def = CRITTERS[c.kind];
    c.age += dt;
    c.flash = Math.max(0, c.flash - dt);
    c.burn = Math.max(0, c.burn - dt);
    c.slowFor = Math.max(0, c.slowFor - dt);

    if (c.hop) {
      c.hop.t = Math.min(1, c.hop.t + dt / HOP_TIME);
      c.x = c.hop.from + (c.hop.to - c.hop.from) * c.hop.t;
      if (c.hop.t >= 1) c.hop = null;
      continue;
    }
    if (c.stuckFor > 0) {
      c.stuckFor = Math.max(0, c.stuckFor - dt);
      c.chewing = false;
      continue;
    }

    // The critter's front edge is a little left of its middle.
    const frontCol = Math.floor(c.x - 0.3);
    const blocker = r.helpers.find(
      (h) => h.row === c.row && h.col === frontCol && !HELPERS[h.kind].flat,
    );
    if (blocker && c.kind === "hopper" && !c.hopped) {
      c.hopped = true;
      c.chewing = false;
      c.hop = { from: c.x, to: blocker.col - 0.35, t: 0 };
      continue;
    }
    if (blocker) {
      c.chewing = true;
      blocker.hp -= def.bite * dt;
      blocker.bitten = 0;
      if (blocker.kind === "firewall") {
        hurt(r, c, HELPERS.firewall.damage * dt);
        c.flash = 0;
        c.burn = 0.3;
      }
      continue;
    }
    c.chewing = false;
    const speed =
      c.kind === "shellby" && c.angry
        ? ANGRY_SPEED
        : c.kind === "grumble" && c.angry
          ? def.speed * 1.4
          : def.speed;
    c.x -= speed * (c.slowFor > 0 ? 0.5 : 1) * dt;

    const note = r.helpers.find(
      (h) =>
        h.kind === "sticky" &&
        h.row === c.row &&
        h.col === Math.floor(c.x) &&
        !usedUp.has(h.id),
    );
    if (note && c.stuckOn !== note.id) {
      c.stuckOn = note.id;
      c.stuckFor = c.kind === "grumble" ? 1 : STICKY_HOLD;
      note.uses -= 1;
      note.acted = 0;
      emit(r, { type: "stick", row: note.row, col: note.col });
      if (note.uses <= 0) usedUp.add(note.id);
    }

    if (c.x < -0.2) {
      // A shredder already running down this row takes this critter too.
      if (r.shreds.some((s) => s.row === c.row)) continue;
      if (r.shredders[c.row]) {
        r.shredders[c.row] = false;
        r.shreds.push({ row: c.row, x: -0.5 });
        emit(r, { type: "shred", row: c.row });
      } else {
        lost = true;
      }
    }
  }
  const broken = r.helpers.filter((h) => h.hp <= 0 || usedUp.has(h.id));
  for (const h of broken) {
    if (h.hp <= 0)
      emit(r, { type: "broken", row: h.row, col: h.col, kind: h.kind });
  }
  if (broken.length > 0) {
    r.helpers = r.helpers.filter((h) => h.hp > 0 && !usedUp.has(h.id));
  }
  return lost;
}

// The score for a finished round. Knocked-out critters count either way; a
// cleared level adds a bonus, more for every shredder still waiting.
export function finalScore(r: Round): number {
  if (r.outcome !== "won") return r.points;
  const shreddersLeft = r.level.rows.filter((row) => r.shredders[row]).length;
  return r.points + 100 + 10 * r.level.number + 50 * shreddersLeft;
}
