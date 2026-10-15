import type { Ctx, Hsl } from "~/games/desk-defense/art/color";
import { ART, ellipse, hsl } from "~/games/desk-defense/art/color";
import { furSpec } from "~/games/desk-defense/art/fur";
import type { GameEvent } from "~/games/desk-defense/round";

// Puffs of fur, sparks, flying energy and the other short-lived bits that
// make a hit feel like a hit. They live only in the drawing: the round
// sends events, and this turns each one into a few particles.

type Kind =
  | "fur"
  | "spark"
  | "star"
  | "orb"
  | "ring"
  | "wind"
  | "beam"
  | "shard"
  | "text"
  | "flash";

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: Hsl;
  // For an orb: where it flies from and to. For a beam: its far end.
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  text?: string;
  spin?: number;
}

// Where things are, in canvas pixels, from the drawing's layout.
export interface Place {
  cell: (row: number, x: number) => { x: number; y: number };
  size: number;
  cellW: number;
  cellH: number;
  energy: { x: number; y: number };
  width: number;
}

export class Fx {
  private items: Particle[] = [];
  // Called when an energy orb reaches the counter, so it can pulse.
  pulse = 0;

  private add(p: Omit<Particle, "age">) {
    if (this.items.length > 400) return;
    this.items.push({ ...p, age: 0 });
  }

  clear() {
    this.items = [];
  }

  take(events: GameEvent[], at: Place, still: boolean) {
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
            this.add({
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
            this.add({
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
            this.add({
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
          this.add({
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
          this.add({
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
          this.add({
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
            this.add({
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
          this.add({
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
          this.add({
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
            this.add({
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
            this.add({
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
          this.add({
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
            this.add({
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
          this.add({
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
          this.add({
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
          this.add({
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
            this.add({
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
          this.add({
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
      }
    }
  }

  step(dt: number) {
    for (const p of this.items) {
      p.age += dt;
      if (p.kind === "orb" && p.from && p.to) {
        const k = Math.min(1, p.age / p.life);
        const ease = k * k * (3 - 2 * k);
        // An arc up, then down to the counter.
        p.x = p.from.x + (p.to.x - p.from.x) * ease;
        p.y =
          p.from.y + (p.to.y - p.from.y) * ease - Math.sin(k * Math.PI) * 30;
        if (p.age >= p.life) this.pulse = 0.3;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "fur" || p.kind === "shard") {
        p.vy += 260 * dt;
        p.vx *= 0.96;
      }
    }
    this.items = this.items.filter((p) => p.age < p.life);
    this.pulse = Math.max(0, this.pulse - dt);
  }

  draw(ctx: Ctx, font: string) {
    for (const p of this.items) {
      const k = p.age / p.life;
      const fade = 1 - k;
      switch (p.kind) {
        case "fur": {
          ellipse(ctx, p.x, p.y, p.size * (1 + k), p.size * (1 + k));
          ctx.fillStyle = hsl(p.color, 0, fade);
          ctx.fill();
          break;
        }
        case "spark": {
          ctx.strokeStyle = hsl(p.color, 10, fade);
          ctx.lineWidth = p.size;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        }
        case "star": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.spin ?? 0) + k * 4);
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const d = i % 2 === 0 ? p.size : p.size * 0.45;
            ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
          }
          ctx.closePath();
          ctx.fillStyle = hsl(p.color, 0, fade);
          ctx.fill();
          ctx.restore();
          break;
        }
        case "orb": {
          const g = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.size * 2.2,
          );
          g.addColorStop(0, hsl(ART.white, 0, 0.95));
          g.addColorStop(0.35, hsl(p.color, 10, 0.9));
          g.addColorStop(1, hsl(p.color, 10, 0));
          ctx.fillStyle = g;
          ellipse(ctx, p.x, p.y, p.size * 2.2, p.size * 2.2);
          ctx.fill();
          break;
        }
        case "ring": {
          ellipse(
            ctx,
            p.x,
            p.y,
            p.size * (0.3 + k * 0.9),
            p.size * (0.3 + k * 0.9) * 0.7,
          );
          ctx.strokeStyle = hsl(p.color, 0, fade * 0.9);
          ctx.lineWidth = Math.max(1, p.size * 0.12 * fade);
          ctx.stroke();
          break;
        }
        case "wind": {
          ctx.strokeStyle = hsl(p.color, 10, fade * 0.9);
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(
            p.x + p.size * 0.5,
            p.y - p.size * 0.15,
            p.x + p.size,
            p.y,
          );
          ctx.stroke();
          break;
        }
        case "beam": {
          if (!p.to) break;
          const g = ctx.createLinearGradient(0, p.y - p.size, 0, p.y + p.size);
          g.addColorStop(0, hsl(p.color, 0, 0));
          g.addColorStop(0.5, hsl(ART.white, 0, fade));
          g.addColorStop(1, hsl(p.color, 0, 0));
          ctx.fillStyle = g;
          ctx.fillRect(p.x, p.y - p.size, p.to.x - p.x, p.size * 2);
          ctx.fillStyle = hsl(p.color, 0, fade * 0.6);
          ctx.fillRect(p.x, p.y - p.size * 0.5, p.to.x - p.x, p.size);
          break;
        }
        case "shard": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.spin ?? 0) + k * 8);
          ctx.fillStyle = hsl(p.color, 0, fade);
          ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
          ctx.restore();
          break;
        }
        case "text": {
          ctx.font = `800 ${Math.round(p.size)}px ${font}`;
          ctx.textAlign = "center";
          ctx.lineWidth = Math.max(2, p.size * 0.18);
          ctx.strokeStyle = hsl(ART.ink, 0, fade);
          ctx.strokeText(p.text ?? "", p.x, p.y);
          ctx.fillStyle = hsl(p.color, 10, fade);
          ctx.fillText(p.text ?? "", p.x, p.y);
          break;
        }
        case "flash": {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, hsl(ART.white, 0, fade));
          g.addColorStop(1, hsl(p.color, 0, 0));
          ctx.fillStyle = g;
          ellipse(ctx, p.x, p.y, p.size, p.size);
          ctx.fill();
          break;
        }
      }
    }
  }
}
