import { ART } from "~/games/art/color";
import type { Fx } from "~/games/art/fx";
import { furSpec } from "~/games/art/fur";
import type { GameEvent } from "~/games/desk-defense/round";

// Turns what just happened in a round into puffs, sparks and flying energy.

// Where things are, in canvas pixels, from the drawing's layout.
export interface Place {
  cell: (row: number, x: number) => { x: number; y: number };
  size: number;
  cellW: number;
  cellH: number;
  energy: { x: number; y: number };
  width: number;
}

export function takeEvents(
  fx: Fx,
  events: GameEvent[],
  at: Place,
  still: boolean,
) {
  const rand = Math.random;
  for (const e of events) {
    switch (e.type) {
      case "poof": {
        const p = at.cell(e.row, e.x);
        const base = furSpec(e.kind).base;
        const count = still ? 6 : e.kind === "grumble" ? 30 : 14;
        for (let i = 0; i < count; i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : at.size * (0.6 + rand() * 1.2);
          fx.add({
            kind: "fur",
            x: p.x,
            y: p.y - at.size * 0.15,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - at.size * 0.4,
            life: 0.5 + rand() * 0.3,
            size: at.size * (0.08 + rand() * 0.08),
            color: { ...base, l: base.l + (rand() - 0.5) * 16 },
          });
        }
        for (let i = 0; i < 3; i++) {
          fx.add({
            kind: "star",
            x: p.x + (rand() - 0.5) * at.size * 0.5,
            y: p.y - at.size * 0.3,
            vx: 0,
            vy: still ? 0 : -at.size * 0.8,
            life: 0.6,
            size: at.size * 0.1,
            color: ART.spark,
            spin: rand() * 6,
          });
        }
        break;
      }
      case "hit": {
        const p = at.cell(e.row, e.x);
        const color =
          e.shot === "puff"
            ? ART.ice
            : e.shot === "power"
              ? ART.gold
              : ART.spark;
        const n = still ? 2 : e.shot === "power" ? 8 : 4;
        for (let i = 0; i < n; i++) {
          const a = Math.PI + (rand() - 0.5) * 2;
          const v = still ? 0 : at.size * (1 + rand() * 1.5);
          fx.add({
            kind: "spark",
            x: p.x + at.size * 0.15,
            y: p.y - at.size * 0.15,
            vx: -Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.25,
            size: at.size * 0.05,
            color,
          });
        }
        break;
      }
      case "brew": {
        const p = at.cell(e.row, e.col + 0.5);
        fx.add({
          kind: "orb",
          x: p.x,
          y: p.y - at.size * 0.5,
          vx: 0,
          vy: 0,
          life: still ? 0.3 : 0.9,
          size: at.size * 0.16,
          color: ART.gold,
          from: { x: p.x, y: p.y - at.size * 0.5 },
          to: at.energy,
        });
        fx.add({
          kind: "text",
          x: p.x,
          y: p.y - at.size * 0.6,
          vx: 0,
          vy: still ? 0 : -at.size * 0.6,
          life: 0.8,
          size: at.size * 0.26,
          color: ART.gold,
          text: "+25",
        });
        break;
      }
      case "fire": {
        if (still) break;
        const p = at.cell(e.row, e.col + 0.75);
        fx.add({
          kind: "flash",
          x: p.x,
          y: p.y - at.size * 0.12,
          vx: 0,
          vy: 0,
          life: 0.12,
          size: at.size * (e.shot === "power" ? 0.35 : 0.2),
          color:
            e.shot === "power"
              ? ART.gold
              : e.shot === "puff"
                ? ART.ice
                : ART.white,
        });
        break;
      }
      case "gust": {
        const p = at.cell(e.row, e.col + 1);
        for (let i = 0; i < (still ? 2 : 7); i++) {
          fx.add({
            kind: "wind",
            x: p.x + rand() * at.cellW,
            y: p.y - at.size * 0.4 + rand() * at.size * 0.6,
            vx: still ? 0 : at.cellW * 5,
            vy: 0,
            life: 0.6,
            size: at.cellW * (0.4 + rand() * 0.4),
            color: ART.ice,
          });
        }
        break;
      }
      case "zap": {
        const p = at.cell(e.row, e.col + 0.8);
        fx.add({
          kind: "beam",
          x: p.x,
          y: p.y - at.size * 0.3,
          vx: 0,
          vy: 0,
          life: 0.35,
          size: at.cellH * 0.22,
          color: ART.bulb,
          to: { x: at.width, y: p.y - at.size * 0.3 },
        });
        break;
      }
      case "wipe": {
        const p = at.cell(e.row, e.col + 0.5);
        fx.add({
          kind: "ring",
          x: p.x,
          y: p.y,
          vx: 0,
          vy: 0,
          life: 0.5,
          size: at.cellW * 1.7,
          color: ART.eraserPink,
        });
        for (let i = 0; i < (still ? 4 : 16); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : at.size * (1.5 + rand() * 2);
          fx.add({
            kind: "shard",
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.5,
            size: at.size * 0.08,
            color: i % 2 === 0 ? ART.eraserPink : ART.eraserBlue,
            spin: rand() * 6,
          });
        }
        break;
      }
      case "helmet": {
        const p = at.cell(e.row, e.x);
        for (let i = 0; i < (still ? 3 : 8); i++) {
          const a = -Math.PI / 2 + (rand() - 0.5) * 2.4;
          const v = still ? 0 : at.size * (1 + rand() * 1.5);
          fx.add({
            kind: "shard",
            x: p.x,
            y: p.y - at.size * 0.55,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0.7,
            size: at.size * 0.1,
            color: ART.metal,
            spin: rand() * 6,
          });
        }
        fx.add({
          kind: "text",
          x: p.x,
          y: p.y - at.size * 0.9,
          vx: 0,
          vy: still ? 0 : -at.size * 0.5,
          life: 0.9,
          size: at.size * 0.24,
          color: ART.ember,
          text: "Grr!",
        });
        break;
      }
      case "roar": {
        const p = at.cell(e.row, e.x);
        for (let i = 0; i < 3; i++) {
          fx.add({
            kind: "ring",
            x: p.x,
            y: p.y - at.size * 0.3,
            vx: 0,
            vy: 0,
            life: 0.6 + i * 0.15,
            size: at.size * (1.2 + i * 0.5),
            color: ART.grumble,
          });
        }
        fx.add({
          kind: "text",
          x: p.x,
          y: p.y - at.size * 1.1,
          vx: 0,
          vy: still ? 0 : -at.size * 0.4,
          life: 1.1,
          size: at.size * 0.32,
          color: ART.grumble,
          text: "ROAR!",
        });
        break;
      }
      case "split": {
        const p = at.cell(e.row, e.x);
        fx.add({
          kind: "ring",
          x: p.x,
          y: p.y - at.size * 0.2,
          vx: 0,
          vy: 0,
          life: 0.35,
          size: at.size * 0.6,
          color: ART.splitterAlt,
        });
        break;
      }
      case "stick": {
        const p = at.cell(e.row, e.col + 0.5);
        fx.add({
          kind: "text",
          x: p.x,
          y: p.y - at.size * 0.7,
          vx: 0,
          vy: still ? 0 : -at.size * 0.4,
          life: 0.8,
          size: at.size * 0.22,
          color: ART.yellow,
          text: "Stuck!",
        });
        break;
      }
      case "broken": {
        const p = at.cell(e.row, e.col + 0.5);
        for (let i = 0; i < (still ? 3 : 10); i++) {
          const a = rand() * Math.PI * 2;
          const v = still ? 0 : at.size * (0.8 + rand());
          fx.add({
            kind: "shard",
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - at.size,
            life: 0.6,
            size: at.size * 0.07,
            color: ART.metal,
            spin: rand() * 6,
          });
        }
        break;
      }
      case "placed": {
        const p = at.cell(e.row, e.col + 0.5);
        fx.add({
          kind: "ring",
          x: p.x,
          y: p.y + at.size * 0.3,
          vx: 0,
          vy: 0,
          life: 0.35,
          size: at.size * 0.5,
          color: ART.white,
        });
        break;
      }
      case "shred":
        break;
      case "wind": {
        // Leaves and streaks of air blowing back across the lawn.
        for (let i = 0; i < (still ? 4 : 18); i++) {
          const row = Math.floor(rand() * 5);
          const p = at.cell(row, rand() * 9);
          fx.add({
            kind: i % 3 === 0 ? "shard" : "wind",
            x: p.x - at.cellW,
            y: p.y - at.size * 0.3 + rand() * at.size * 0.5,
            vx: still ? 0 : at.cellW * (4 + rand() * 3),
            vy: still ? 0 : (rand() - 0.5) * at.size,
            life: 0.9,
            size:
              i % 3 === 0 ? at.size * 0.08 : at.cellW * (0.5 + rand() * 0.5),
            color: i % 3 === 0 ? ART.hopper : ART.white,
            spin: rand() * 6,
          });
        }
        break;
      }
    }
  }
}
