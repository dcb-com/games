import { useSyncExternalStore } from "react";

import type { Player, ScoreRow } from "~/mock/game-scores";
import { COWORKER_SCORES } from "~/mock/game-scores";
import { LEVEL_COUNT } from "~/games/desk-defense/levels";
import type { Owned, UpgradeId } from "~/games/desk-defense/upgrades";
import { NO_UPGRADES, UPGRADES, nextCost } from "~/games/desk-defense/upgrades";

// What a player keeps between rounds: coins, upgrades, the best score on
// each level and how far they have got. It lives in the browser's storage,
// one entry per player, so the console's agent and the payroll admin each
// keep their own. The real app would keep it on the server.

export interface Progress {
  name: string;
  coins: number;
  owned: Owned;
  // Best score on each level, by level number.
  best: Record<number, number>;
  // The highest level cleared. 0 before the guided level is done.
  cleared: number;
}

const PREFIX = "desk-defense:v1:";

function fresh(player: Player): Progress {
  return {
    name: player.name,
    coins: 0,
    owned: { ...NO_UPGRADES },
    best: {},
    cleared: 0,
  };
}

function num(value: number | string | boolean | null | object): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function numberAt(obj: object, key: string): number {
  // oxlint-disable-next-line dcb/no-unknown -- stored JSON, checked on the next line
  const value: unknown = Reflect.get(obj, key);
  return typeof value === "number" ? num(value) : 0;
}

// Stored data comes back as plain JSON. Read each field on its own and fall
// back to zero for anything missing or odd, so an old or hand-edited entry
// never breaks the game.
export function parseProgress(text: string | null, player: Player): Progress {
  const base = fresh(player);
  if (!text) return base;
  // oxlint-disable-next-line dcb/no-unknown -- stored JSON, checked field by field below
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return base;
  }
  if (typeof raw !== "object" || raw === null) return base;
  const owned = { ...NO_UPGRADES };
  if ("owned" in raw && typeof raw.owned === "object" && raw.owned) {
    for (const u of UPGRADES) {
      owned[u.id] = Math.min(u.costs.length, numberAt(raw.owned, u.id));
    }
  }
  const best: Record<number, number> = {};
  if ("best" in raw && typeof raw.best === "object" && raw.best) {
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const score = numberAt(raw.best, String(n));
      if (score > 0) best[n] = score;
    }
  }
  return {
    name: player.name,
    coins: "coins" in raw && typeof raw.coins === "number" ? num(raw.coins) : 0,
    owned,
    best,
    cleared:
      "cleared" in raw && typeof raw.cleared === "number"
        ? Math.min(LEVEL_COUNT, num(raw.cleared))
        : 0,
  };
}

// Storage can be missing or refuse to work (a private window, a full disk).
// The game still plays then; it just forgets when the page closes.
function load(player: Player): Progress {
  try {
    return parseProgress(localStorage.getItem(PREFIX + player.email), player);
  } catch {
    return fresh(player);
  }
}

function save(email: string, p: Progress) {
  try {
    localStorage.setItem(PREFIX + email, JSON.stringify(p));
  } catch {
    // Kept in memory only. See load.
  }
}

const cache = new Map<string, Progress>();
const listeners = new Set<() => void>();

export function getProgress(player: Player): Progress {
  let p = cache.get(player.email);
  if (!p) {
    p = load(player);
    cache.set(player.email, p);
  }
  return p;
}

function setProgress(player: Player, next: Progress) {
  cache.set(player.email, next);
  save(player.email, next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(player: Player): Progress {
  return useSyncExternalStore(
    subscribe,
    () => getProgress(player),
    () => getProgress(player),
  );
}

export function totalScore(p: Progress): number {
  return Object.values(p.best).reduce((sum, s) => sum + s, 0);
}

// Coins for a finished round: a fifth of the points, plus a bonus for a
// cleared level. The bonus is smaller on a level already cleared, so going
// forward pays best.
export function coinsFor(
  level: number,
  points: number,
  won: boolean,
  firstClear: boolean,
): number {
  const bonus = won ? (firstClear ? 20 + 4 * level : 10 + 2 * level) : 0;
  return Math.floor(points / 5) + bonus;
}

export interface RoundReport {
  coins: number;
  score: number;
  newBest: boolean;
  firstClear: boolean;
}

export function recordRound(
  player: Player,
  level: number,
  score: number,
  points: number,
  won: boolean,
): RoundReport {
  const p = getProgress(player);
  const firstClear = won && level > p.cleared;
  const coins = coinsFor(level, points, won, firstClear);
  const before = p.best[level] ?? 0;
  const newBest = won && score > before;
  setProgress(player, {
    ...p,
    coins: p.coins + coins,
    // Only a cleared level counts toward the leaderboard.
    best: newBest ? { ...p.best, [level]: score } : p.best,
    cleared: firstClear ? Math.max(p.cleared, level) : p.cleared,
  });
  return { coins, score, newBest, firstClear };
}

export function buyUpgrade(player: Player, id: UpgradeId): boolean {
  const p = getProgress(player);
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  const cost = nextCost(def, p.owned[id]);
  if (cost === null || p.coins < cost) return false;
  setProgress(player, {
    ...p,
    coins: p.coins - cost,
    owned: { ...p.owned, [id]: p.owned[id] + 1 },
  });
  return true;
}

// Everyone who has played in this browser, from storage.
function storedPlayers(): ScoreRow[] {
  const rows: ScoreRow[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const email = key.slice(PREFIX.length);
      const cached = cache.get(email);
      const p =
        cached ??
        parseProgress(localStorage.getItem(key), { name: email, email });
      rows.push({ name: p.name, email, score: totalScore(p) });
    }
  } catch {
    // No storage: only the current player, added below.
  }
  return rows;
}

// The made-up coworkers and everyone who has played here, best first. The
// current player is always on it, even before their first clear.
export function leaderboard(player: Player): ScoreRow[] {
  const byEmail = new Map<string, ScoreRow>();
  for (const row of COWORKER_SCORES) byEmail.set(row.email, row);
  for (const row of storedPlayers()) byEmail.set(row.email, row);
  byEmail.set(player.email, {
    ...player,
    score: totalScore(getProgress(player)),
  });
  return [...byEmail.values()].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
}

// For tests: forget what is held in memory.
export function resetProgressCache() {
  cache.clear();
}
