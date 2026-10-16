import { seeded } from "~/games/art/color";
import type { Rival } from "~/mock/game-scores";
import type { Base, Building } from "~/games/cubicle-clash/base";
import { buildingAt, inside } from "~/games/cubicle-clash/base";
import type { BuildingKind } from "~/games/cubicle-clash/units";
import { BUILDINGS, COLS, ROWS } from "~/games/cubicle-clash/units";

// The made-up coworkers' bases. Each one is built from the coworker's
// address and head office level, so it is the same base every visit. The
// real app would load each coworker's real base instead.

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MIDDLE = { col: 8, row: 4 };

function distance(col: number, row: number) {
  return Math.hypot(col + 0.5 - MIDDLE.col, row + 0.5 - MIDDLE.row);
}

export function rivalBase(rival: Rival): Base {
  const random = seeded(hash(rival.email));
  const office = Math.max(1, Math.min(5, rival.office));
  const buildings: Building[] = [];
  const base: Base = { buildings, nextId: 1 };
  const add = (kind: BuildingKind, level: number, col: number, row: number) => {
    buildings.push({ id: base.nextId++, kind, level, col, row, since: 0 });
  };
  add("office", office, 7, 3);

  const open = (near: number, far: number) => {
    const spots: { col: number; row: number }[] = [];
    for (let col = 1; col < COLS - 1; col++) {
      for (let row = 1; row < ROWS - 1; row++) {
        const d = distance(col, row);
        if (
          d >= near &&
          d <= far &&
          inside(col, row) &&
          !buildingAt(base, col, row)
        ) {
          spots.push({ col, row });
        }
      }
    }
    return spots;
  };
  const place = (kind: BuildingKind, near: number, far: number) => {
    const limit = BUILDINGS[kind].limit[office - 1] ?? 0;
    // Most coworkers have not built everything they could.
    const count = Math.max(0, limit - (random() < 0.4 ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const spots = open(near, far);
      const spot = spots[Math.floor(random() * spots.length)];
      if (!spot) return;
      const level = Math.max(1, office - (random() < 0.5 ? 1 : 0));
      add(kind, level, spot.col, spot.row);
    }
  };

  // Defenses close in, the rest further out, the way people tend to build.
  place("lamp", 1.5, 3);
  place("printer", 1.5, 3.2);
  place("stapler", 1.5, 4);
  place("fan", 2, 4);
  place("vault", 2, 4.5);
  place("breakroom", 3.5, 8);
  place("press", 3.5, 8);
  place("coffee", 3.5, 8);

  // A ring of cubicle walls around the middle, from head office level 2.
  if (office >= 2) {
    const limit = BUILDINGS.wall.limit[office - 1] ?? 0;
    let left = limit;
    const ring =
      office >= 4
        ? { c0: 4, c1: 11, r0: 1, r1: 6 }
        : { c0: 5, c1: 10, r0: 2, r1: 5 };
    for (let col = ring.c0; col <= ring.c1 && left > 0; col++) {
      for (let row = ring.r0; row <= ring.r1 && left > 0; row++) {
        const edge =
          col === ring.c0 ||
          col === ring.c1 ||
          row === ring.r0 ||
          row === ring.r1;
        if (!edge || buildingAt(base, col, row) || !inside(col, row)) continue;
        add("wall", Math.max(1, office - 1), col, row);
        left -= 1;
      }
    }
  }
  return base;
}

// What a coworker has lying around to take, at most, in one raid.
export function lootOf(rival: Rival) {
  const random = seeded(hash(rival.email) + 17);
  return {
    coins: Math.round(220 * rival.office + random() * 180),
    coffee: Math.round(160 * rival.office + random() * 140),
  };
}
