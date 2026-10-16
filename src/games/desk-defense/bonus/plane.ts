import type { Ctx } from "~/games/art/color";
import {
  ART,
  hsl,
  outline,
  rounded,
  shade,
  shadeDown,
} from "~/games/art/color";
import type { BonusView, Input, Key } from "~/games/desk-defense/bonus/kit";
import { Bonus, H, W } from "~/games/desk-defense/bonus/kit";

// Paper Plane: a paper plane glides across the office. Tap to flap it up;
// it sinks on its own. Thread it through the gaps between stacks of
// binders. Hitting a stack or the floor ends the flight.

interface Stack {
  x: number;
  gap: number;
  passed: boolean;
}

const PLANE_X = 120;
const GAP = 112;
const WIDE = 54;

export class Plane extends Bonus {
  readonly id = "plane";
  readonly seconds = 45;
  private y = H / 2;
  private vy = 0;
  private stacks: Stack[] = [];
  private next = 0.8;
  private started = false;
  private finished = false;

  protected play(dt: number, _input: Input) {
    // The plane waits, bobbing, until the first tap.
    if (!this.started) {
      this.time = Math.max(0, this.time - dt);
      return;
    }
    this.vy += 820 * dt;
    this.y += this.vy * dt;
    const speed = 150 + this.time * 1.5;
    this.next -= dt;
    if (this.next <= 0) {
      this.next = 1.45;
      const gap = Math.max(GAP - this.time * 0.6, 88);
      const middle = 70 + Math.random() * (H - 140);
      this.stacks.push({ x: W + WIDE, gap: middle - gap / 2, passed: false });
    }
    for (const s of this.stacks) s.x -= speed * dt;
    for (const s of this.stacks) {
      const gap = Math.max(GAP - this.time * 0.6, 88);
      const inside = Math.abs(s.x - PLANE_X) < WIDE / 2 + 12;
      if (inside && (this.y - 8 < s.gap || this.y + 8 > s.gap + gap))
        this.crash();
      if (!s.passed && s.x < PLANE_X - WIDE / 2) {
        s.passed = true;
        this.score += 1;
        this.pop(PLANE_X, this.y - 26, "+1", ART.gold);
      }
    }
    // The ceiling stops the plane; only the floor ends the flight.
    if (this.y < 12) {
      this.y = 12;
      this.vy = Math.max(0, this.vy);
    }
    if (this.y > H) this.crash();
    this.stacks = this.stacks.filter((s) => s.x > -WIDE);
    // Lasting the whole flight is worth five more.
    if (this.time >= this.seconds - 0.05 && !this.over && !this.finished) {
      this.finished = true;
      this.score += 5;
    }
  }

  private crash() {
    if (this.over) return;
    this.over = true;
    this.burst(PLANE_X, this.y, ART.white, 16);
  }

  press(key: Key) {
    if (key === "action" || key === "up") {
      this.started = true;
      this.vy = -300;
    }
  }

  point(_x: number, _y: number, down: boolean) {
    if (down) this.press("action");
  }

  protected scene(ctx: Ctx, view: BonusView) {
    const gapSize = Math.max(GAP - this.time * 0.6, 88);
    for (const s of this.stacks) {
      this.binders(ctx, s.x, 0, s.gap);
      this.binders(ctx, s.x, s.gap + gapSize, H);
    }
    const bob = this.started || view.still ? 0 : Math.sin(view.t * 3) * 6;
    ctx.save();
    ctx.translate(PLANE_X, this.y + bob);
    ctx.rotate(Math.max(-0.5, Math.min(0.7, this.vy / 600)));
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-18, 10);
    ctx.closePath();
    shade(ctx, ART.white, 0, 0, 22, 0, -16);
    outline(ctx, 1.5, ART.ink, 0.6);
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-10, 0);
    outline(ctx, 1, ART.ink, 0.4);
    ctx.restore();
    if (!this.started) {
      ctx.fillStyle = hsl(ART.ink, 0, 0.7);
      ctx.font = `700 16px ${view.font}`;
      ctx.textAlign = "center";
      ctx.fillText("Press Space or click to fly", W / 2, H - 30);
    }
  }

  // A stack of colored binders from y0 to y1.
  private binders(ctx: Ctx, x: number, y0: number, y1: number) {
    const colors = [ART.coffee, ART.fan, ART.hopper, ART.lamp, ART.chonk];
    let i = Math.floor(x) % colors.length;
    for (let y = y0; y < y1; y += 22) {
      const h = Math.min(20, y1 - y);
      if (h < 4) break;
      rounded(ctx, x - WIDE / 2, y + 1, WIDE, h, 4);
      shadeDown(
        ctx,
        colors[Math.abs(i) % colors.length] ?? ART.coffee,
        y,
        y + h,
        12,
        -10,
      );
      outline(ctx, 1.2, ART.ink, 0.5);
      ctx.fillStyle = hsl(ART.white, 0, 0.7);
      ctx.fillRect(x - 10, y + h / 2 - 2, 20, 4);
      i += 1;
    }
  }
}
