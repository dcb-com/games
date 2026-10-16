import type { Ctx, Hsl } from "~/games/art/color";
import {
  ART,
  dotEyes,
  ellipse,
  groundShadow,
  hsl,
  outline,
  rounded,
  shade,
  shadeDown,
} from "~/games/art/color";
import type { Pose } from "~/games/art/critters";
import { drawCritter, sampleCritter } from "~/games/art/critters";
import { Fx } from "~/games/art/fx";
import type { BonusId, Theme } from "~/games/desk-defense/levels";
import type { CritterKind } from "~/games/desk-defense/units";
import { CRITTERS } from "~/games/desk-defense/units";

// What every bonus game shares: a fixed 16:9 play area, the keys it hears,
// the time limit and score, a backdrop in the world's colors, and Dot.

// Every bonus game draws in this many units; the screen scales it to fit.
export const W = 560;
export const H = 315;

export type Key = "left" | "right" | "up" | "down" | "action";

export interface Input {
  held: Set<Key>;
}

export interface BonusView {
  t: number;
  still: boolean;
  ratio: number;
  font: string;
}

export interface BonusRun {
  readonly id: BonusId;
  readonly seconds: number;
  time: number;
  over: boolean;
  score: number;
  step(dt: number, input: Input): void;
  press(key: Key): void;
  // A pointer at (x, y) in play units: moved, or pressed.
  point(x: number, y: number, down: boolean): void;
  draw(ctx: Ctx, view: BonusView): void;
}

// The common part of every bonus game: the clock, the score and the
// effects. Each game adds its own play on top.
export abstract class Bonus implements BonusRun {
  abstract readonly id: BonusId;
  abstract readonly seconds: number;
  time = 0;
  over = false;
  score = 0;
  protected fx = new Fx();
  protected theme: Theme;
  // Lives, for games that have them. 0 means the game has none.
  protected lives = 0;
  protected hurtFor = 0;

  constructor(theme: Theme) {
    this.theme = theme;
  }

  step(dt: number, input: Input) {
    if (this.over) return;
    this.time += dt;
    this.hurtFor = Math.max(0, this.hurtFor - dt);
    this.fx.step(dt);
    this.play(dt, input);
    if (this.time >= this.seconds) this.over = true;
  }

  protected abstract play(dt: number, input: Input): void;
  abstract press(key: Key): void;
  point(_x: number, _y: number, _down: boolean) {
    // Most games are fine with the keys alone.
  }
  protected abstract scene(ctx: Ctx, view: BonusView): void;

  draw(ctx: Ctx, view: BonusView) {
    backdrop(ctx, this.theme);
    this.scene(ctx, view);
    this.fx.draw(ctx, view.font);
    hud(
      ctx,
      view,
      this.score,
      Math.max(0, this.seconds - this.time),
      this.seconds,
      this.lives,
    );
  }

  // Lose a life, with a short spell of safety after.
  protected hurt(): boolean {
    if (this.hurtFor > 0 || this.lives <= 0) return false;
    this.lives -= 1;
    this.hurtFor = 1;
    if (this.lives <= 0) this.over = true;
    return true;
  }

  protected pop(x: number, y: number, text: string, color: Hsl, still = false) {
    this.fx.add({
      kind: "text",
      x,
      y,
      vx: 0,
      vy: still ? 0 : -40,
      life: 0.8,
      size: 18,
      color,
      text,
    });
  }

  protected burst(x: number, y: number, color: Hsl, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 120;
      this.fx.add({
        kind: "fur",
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        life: 0.5,
        size: 4 + Math.random() * 3,
        color,
      });
    }
  }
}

const BACKDROPS: Record<Theme, [Hsl, Hsl]> = {
  office: [ART.wood, { ...ART.wood, l: ART.wood.l - 12 }],
  breakroom: [
    { h: 200, s: 40, l: 90 },
    { h: 205, s: 25, l: 76 },
  ],
  server: [
    { h: 225, s: 30, l: 26 },
    { h: 228, s: 32, l: 14 },
  ],
  rooftop: [
    { h: 200, s: 75, l: 78 },
    { h: 104, s: 50, l: 48 },
  ],
};

export function backdrop(ctx: Ctx, theme: Theme) {
  const [top, bottom] = BACKDROPS[theme];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, hsl(top, 4));
  g.addColorStop(1, hsl(bottom));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // A soft vignette, so the middle reads first.
  const v = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.3,
    W / 2,
    H / 2,
    W * 0.7,
  );
  v.addColorStop(0, hsl(ART.shadow, 0, 0));
  v.addColorStop(1, hsl(ART.shadow, 0, 0.25));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

export function hud(
  ctx: Ctx,
  view: BonusView,
  score: number,
  left: number,
  seconds: number,
  lives: number,
) {
  rounded(ctx, 8, 8, 110, 26, 13);
  ctx.fillStyle = hsl(ART.ink, 0, 0.55);
  ctx.fill();
  ctx.fillStyle = hsl(ART.white);
  ctx.font = `700 15px ${view.font}`;
  ctx.textAlign = "left";
  ctx.fillText(`Score ${score}`, 18, 26);

  // The time left, as a bar that empties.
  rounded(ctx, W - 128, 8, 120, 26, 13);
  ctx.fillStyle = hsl(ART.ink, 0, 0.55);
  ctx.fill();
  rounded(ctx, W - 122, 17, 108 * (left / seconds), 8, 4);
  ctx.fillStyle = left < 10 ? hsl(ART.ember, 10) : hsl(ART.gold, 5);
  ctx.fill();

  for (let i = 0; i < lives; i++) {
    heart(ctx, 136 + i * 22, 21, 8);
  }
}

function heart(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(
    x - r * 1.4,
    y - r * 0.1,
    x - r * 0.6,
    y - r * 1.2,
    x,
    y - r * 0.4,
  );
  ctx.bezierCurveTo(
    x + r * 0.6,
    y - r * 1.2,
    x + r * 1.4,
    y - r * 0.1,
    x,
    y + r * 0.9,
  );
  ctx.fillStyle = hsl(ART.ember, 8);
  ctx.fill();
  outline(ctx, 1.5, ART.ink, 0.6);
}

// Dot, the desk robot, standing with its feet at (x, y).
export function drawDot(
  ctx: Ctx,
  x: number,
  y: number,
  s: number,
  t: number,
  still: boolean,
) {
  const u = s / 10;
  const bob = still ? 0 : Math.abs(Math.sin(t * 10)) * u * 0.5;
  groundShadow(ctx, x, y, s * 0.3, s * 0.07);
  ctx.save();
  ctx.translate(x, y - bob);
  // Wheels.
  for (const dx of [-u * 2, u * 2]) {
    ellipse(ctx, dx, -u * 0.9, u * 1, u * 1);
    shade(ctx, ART.slate, dx, -u * 0.9, u, 20, -6);
    outline(ctx, u * 0.25);
  }
  // Body.
  rounded(ctx, -u * 3.2, -u * 6.4, u * 6.4, u * 5, u * 1.6);
  shadeDown(ctx, ART.stapler, -u * 6.4, -u * 1.4, 18, -14);
  outline(ctx, u * 0.35);
  // Screen face.
  rounded(ctx, -u * 2.4, -u * 5.6, u * 4.8, u * 3, u * 0.9);
  ctx.fillStyle = hsl(ART.slate, -6);
  ctx.fill();
  ctx.save();
  ctx.translate(0, 0);
  dotEyes(ctx, 0, -u * 4.3, u * 2, u * 0.45, {
    happy: !still && Math.sin(t * 2) > 0.7,
  });
  ctx.restore();
  ctx.strokeStyle = hsl(ART.ice, 10);
  ctx.lineWidth = u * 0.3;
  ctx.beginPath();
  ctx.arc(0, -u * 3.9, u * 0.6, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  // Antenna.
  ctx.strokeStyle = hsl(ART.ink);
  ctx.lineWidth = u * 0.3;
  ctx.beginPath();
  ctx.moveTo(0, -u * 6.4);
  ctx.lineTo(0, -u * 7.8);
  ctx.stroke();
  ellipse(ctx, 0, -u * 8.1, u * 0.6, u * 0.6);
  ctx.fillStyle = hsl(ART.gold, still ? 0 : Math.sin(t * 6) * 10);
  ctx.fill();
  ctx.restore();
}

// Does a point fall within a circle?
export function near(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
) {
  return Math.hypot(ax - bx, ay - by) <= r;
}

// A random whole number from 0 up to, but not including, n.
export function pick(n: number) {
  return Math.floor(Math.random() * n);
}

// A critter standing with its feet at (x, feet), s across.
export function critterAt(
  ctx: Ctx,
  kind: CritterKind,
  x: number,
  feet: number,
  s: number,
  view: BonusView,
  pose: Partial<Pose> = {},
) {
  const c: Pose = {
    ...sampleCritter(kind),
    angry: kind === "grumble",
    ...pose,
  };
  drawCritter(ctx, c, x, feet - s * 0.32, s / CRITTERS[kind].scale, {
    t: view.t,
    still: view.still,
    ratio: view.ratio,
  });
}
