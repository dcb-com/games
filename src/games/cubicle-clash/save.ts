import { useSyncExternalStore } from "react";

import { seeded } from "~/games/art/color";
import type { Player, Rival } from "~/mock/game-scores";
import { CLASH_RIVALS } from "~/mock/game-scores";
import type {
  Base,
  Building,
  Clutter,
  Job,
  Wallet,
} from "~/games/cubicle-clash/base";
import {
  defensePower,
  inside,
  pileUp,
  starterBase,
} from "~/games/cubicle-clash/base";
import { hash } from "~/games/cubicle-clash/rivals";
import type {
  BuildingKind,
  ClutterKind,
  TroopKind,
} from "~/games/cubicle-clash/units";
import {
  BUILDINGS,
  CLUTTER,
  MAX_LEVEL,
  TROOP_ORDER,
} from "~/games/cubicle-clash/units";

// What a player keeps in Cubicle Clash: their base, coins and coffee, the
// crew waiting in the break room, trophies, and the raids that happened
// while they were away. It lives in the browser's storage, one entry per
// player. The real app would keep it on the server, and real coworkers
// would do the raiding.

export interface LogEntry {
  at: number;
  name: string;
  email: string;
  // Who raided whom.
  theyRaided: boolean;
  stars: number;
  coins: number;
  trophies: number;
}

export interface Clash {
  name: string;
  wallet: Wallet;
  base: Base;
  army: Record<TroopKind, number>;
  trophies: number;
  // Trophies each coworker has won or lost against this player.
  rivals: Record<string, number>;
  log: LogEntry[];
  // When the player last had the game open, for raids while away.
  seen: number;
  // Hints from Dot already shown.
  tips: number;
  // Raids in the log the player has not looked at yet.
  unseen: number;
}

const PREFIX = "cubicle-clash:v1:";

export const NO_ARMY: Record<TroopKind, number> = {
  fuzzball: 0,
  zippy: 0,
  hopper: 0,
  chonk: 0,
  grumble: 0,
};

export function freshClash(player: Player, now: number): Clash {
  return {
    name: player.name,
    wallet: { coins: 300, coffee: 150, gems: 10 },
    base: starterBase(now),
    army: { ...NO_ARMY, fuzzball: 6 },
    trophies: 0,
    rivals: {},
    log: [],
    seen: now,
    tips: 0,
    unseen: 0,
  };
}

// Field readers for stored JSON. Anything odd falls back to a safe value,
// so an old or hand-edited entry never breaks the game.
// oxlint-disable-next-line dcb/no-unknown -- stored JSON, checked on the way out
function field(obj: unknown, key: string): unknown {
  return typeof obj === "object" && obj !== null
    ? Reflect.get(obj, key)
    : undefined;
}
// oxlint-disable-next-line dcb/no-unknown -- stored JSON, checked here
function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
// oxlint-disable-next-line dcb/no-unknown -- stored JSON, checked here
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
const KINDS = Object.keys(BUILDINGS);
function isKind(text: string): text is BuildingKind {
  return KINDS.includes(text);
}

const CLUTTER_KINDS = Object.keys(CLUTTER);
function isClutter(text: string): text is ClutterKind {
  return CLUTTER_KINDS.includes(text);
}

// oxlint-disable-next-line dcb/no-unknown -- stored JSON, checked here
function readJob(value: unknown): Job | null {
  const kind = str(field(value, "kind"));
  if (kind !== "build" && kind !== "upgrade") return null;
  const until = num(field(value, "until"), 0);
  return { kind, until, total: Math.max(1, num(field(value, "total"), 1)) };
}

export function parseClash(
  text: string | null,
  player: Player,
  now: number,
): Clash {
  const base = freshClash(player, now);
  if (!text) return base;
  // oxlint-disable-next-line dcb/no-unknown -- stored JSON, checked field by field below
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return base;
  }
  if (typeof raw !== "object" || raw === null) return base;

  const list = field(field(raw, "base"), "buildings");
  const buildings: Building[] = [];
  if (Array.isArray(list)) {
    for (const item of list) {
      const kind = str(field(item, "kind"));
      if (!isKind(kind)) continue;
      const b: Building = {
        id: Math.floor(num(field(item, "id"))),
        kind,
        level: Math.min(
          MAX_LEVEL,
          Math.max(1, Math.floor(num(field(item, "level"), 1))),
        ),
        col: Math.floor(num(field(item, "col"))),
        row: Math.floor(num(field(item, "row"))),
        since: num(field(item, "since"), now),
        job: readJob(field(item, "job")),
      };
      if (inside(b.col, b.row, BUILDINGS[kind].size)) buildings.push(b);
    }
  }
  if (!buildings.some((b) => b.kind === "office")) return base;

  const rawClutter = field(field(raw, "base"), "clutter");
  const clutter: Clutter[] = [];
  if (Array.isArray(rawClutter)) {
    for (const item of rawClutter.slice(0, 20)) {
      const kind = str(field(item, "kind"));
      if (!isClutter(kind)) continue;
      const until = num(field(field(item, "clearing"), "until"), -1);
      clutter.push({
        id: Math.floor(num(field(item, "id"))),
        kind,
        col: Math.floor(num(field(item, "col"))),
        row: Math.floor(num(field(item, "row"))),
        clearing:
          until >= 0
            ? { until, total: num(field(field(item, "clearing"), "total"), 1) }
            : null,
      });
    }
  }
  const nextId = Math.max(
    num(field(field(raw, "base"), "nextId")),
    ...buildings.map((b) => b.id + 1),
    ...clutter.map((c) => c.id + 1),
  );

  const army = { ...NO_ARMY };
  for (const k of TROOP_ORDER)
    army[k] = Math.max(0, Math.floor(num(field(field(raw, "army"), k))));

  const rivals: Record<string, number> = {};
  for (const r of CLASH_RIVALS) {
    const value = num(field(field(raw, "rivals"), r.email));
    if (value !== 0) rivals[r.email] = value;
  }

  const log: LogEntry[] = [];
  const rawLog = field(raw, "log");
  if (Array.isArray(rawLog)) {
    for (const item of rawLog.slice(0, 20)) {
      log.push({
        at: num(field(item, "at")),
        name: str(field(item, "name")),
        email: str(field(item, "email")),
        theyRaided: field(item, "theyRaided") === true,
        stars: Math.min(3, Math.max(0, num(field(item, "stars")))),
        coins: Math.max(0, num(field(item, "coins"))),
        trophies: num(field(item, "trophies")),
      });
    }
  }

  return {
    name: player.name,
    wallet: {
      coins: Math.max(0, Math.floor(num(field(field(raw, "wallet"), "coins")))),
      coffee: Math.max(
        0,
        Math.floor(num(field(field(raw, "wallet"), "coffee"))),
      ),
      gems: Math.max(
        0,
        Math.floor(num(field(field(raw, "wallet"), "gems"), 10)),
      ),
    },
    base: { buildings, clutter, nextId },
    army,
    trophies: Math.max(0, Math.floor(num(field(raw, "trophies")))),
    rivals,
    log,
    seen: num(field(raw, "seen"), now),
    tips: Math.max(0, Math.floor(num(field(raw, "tips")))),
    unseen: Math.max(0, Math.floor(num(field(raw, "unseen")))),
  };
}

const cache = new Map<string, Clash>();
const listeners = new Set<() => void>();

function load(player: Player, now: number): Clash {
  try {
    return parseClash(localStorage.getItem(PREFIX + player.email), player, now);
  } catch {
    return freshClash(player, now);
  }
}

export function getClash(player: Player): Clash {
  let c = cache.get(player.email);
  if (!c) {
    c = load(player, Date.now());
    cache.set(player.email, c);
  }
  return c;
}

// The game changes its Clash in place while it plays, then calls this to
// save it and redraw the menus.
export function saveClash(player: Player, c: Clash) {
  const next = { ...c };
  cache.set(player.email, next);
  try {
    localStorage.setItem(PREFIX + player.email, JSON.stringify(next));
  } catch {
    // Kept in memory only, as in Desk Defense.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useClash(player: Player): Clash {
  return useSyncExternalStore(
    subscribe,
    () => getClash(player),
    () => getClash(player),
  );
}

export function resetClashCache() {
  cache.clear();
}

export function rivalTrophies(c: Clash, rival: Rival): number {
  return Math.max(0, rival.trophies + (c.rivals[rival.email] ?? 0));
}

// Raids by coworkers while the player was away. One chance every twenty
// minutes, three raids at most per visit. Each chance is decided by a seed
// from the player and the time, so a reload gives the same story.
const AWAY_STEP = 20 * 60_000;

export function raidsWhileAway(
  c: Clash,
  player: Player,
  now: number,
): LogEntry[] {
  const first = Math.floor(c.seen / AWAY_STEP) + 1;
  const last = Math.floor(now / AWAY_STEP);
  const found: LogEntry[] = [];
  const defense = defensePower(c.base);
  for (
    let slot = Math.max(first, last - 30);
    slot <= last && found.length < 3;
    slot++
  ) {
    const random = seeded(hash(player.email) + slot);
    if (random() > 0.45) continue;
    // Someone with about as many trophies comes calling.
    const near = [...CLASH_RIVALS]
      .sort(
        (a, b) =>
          Math.abs(rivalTrophies(c, a) - c.trophies) -
          Math.abs(rivalTrophies(c, b) - c.trophies),
      )
      .slice(0, 4);
    const rival = near[Math.floor(random() * near.length)];
    if (!rival) continue;
    const attack = 260 * rival.office + random() * 300;
    const odds = attack / (attack + defense);
    const stars = odds > 0.72 ? 3 : odds > 0.58 ? 2 : odds > 0.45 ? 1 : 0;
    const coins = Math.floor(c.wallet.coins * 0.07 * stars);
    const trophies = stars > 0 ? -(6 + 3 * stars) : 7;
    found.push({
      at: slot * AWAY_STEP,
      name: rival.name,
      email: rival.email,
      theyRaided: true,
      stars,
      coins,
      trophies,
    });
  }
  return found;
}

// Apply raids while away to the save, and mark the player as here now.
export function welcomeBack(c: Clash, player: Player, now: number): LogEntry[] {
  const found = raidsWhileAway(c, player, now);
  for (const e of found) {
    c.wallet.coins = Math.max(0, c.wallet.coins - e.coins);
    c.trophies = Math.max(0, c.trophies + e.trophies);
    c.rivals[e.email] = (c.rivals[e.email] ?? 0) - e.trophies;
  }
  c.log = [...found.reverse(), ...c.log].slice(0, 20);
  c.unseen = Math.min(c.log.length, c.unseen + found.length);
  // Clutter piles up on the land while nobody is looking.
  pileUp(c.base, c.seen, now);
  c.seen = now;
  return found;
}

export interface BoardRow {
  name: string;
  email: string;
  trophies: number;
}

// Everyone who has played Cubicle Clash in this browser, from storage.
function storedPlayers(): BoardRow[] {
  const rows: BoardRow[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const email = key.slice(PREFIX.length);
      const c =
        cache.get(email) ??
        parseClash(localStorage.getItem(key), { name: email, email }, 0);
      rows.push({ name: c.name, email, trophies: c.trophies });
    }
  } catch {
    // No storage: only the current player, added below.
  }
  return rows;
}

// Trophies, best first: the made-up coworkers, as this player's raids have
// changed them, and everyone who has played here.
export function trophyBoard(player: Player): BoardRow[] {
  const c = getClash(player);
  const rows = new Map<string, BoardRow>();
  for (const r of CLASH_RIVALS) {
    rows.set(r.email, {
      name: r.name,
      email: r.email,
      trophies: rivalTrophies(c, r),
    });
  }
  for (const row of storedPlayers()) rows.set(row.email, row);
  rows.set(player.email, {
    name: player.name,
    email: player.email,
    trophies: c.trophies,
  });
  return [...rows.values()].sort(
    (a, b) => b.trophies - a.trophies || a.name.localeCompare(b.name),
  );
}
