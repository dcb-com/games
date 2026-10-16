import type { Ctx, Hsl } from "~/games/art/color";
import { ART, ellipse, hsl } from "~/games/art/color";

// Puffs of fur, sparks, flying energy and the other short-lived bits that
// make a hit feel like a hit. They live only in the drawing. Each game turns
// its own events into particles with `add`.

export type Kind =
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

export interface Particle {
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

export class Fx {
  private items: Particle[] = [];
  // Called when an energy orb reaches the counter, so it can pulse.
  pulse = 0;

  add(p: Omit<Particle, "age">) {
    if (this.items.length > 400) return;
    this.items.push({ ...p, age: 0 });
  }

  clear() {
    this.items = [];
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
